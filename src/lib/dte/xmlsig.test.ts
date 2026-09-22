import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeTestCertificate } from "@/lib/sii/fixtures";
import { buildDteXml, buildEnvioDte } from "./xml";
import type { BuildDteInput } from "./xml";
import {
  canonicalize,
  signDteXml,
  signEnvioXml,
  signSeedXml,
  verifyDteSignature,
  verifyEnvioSignature,
  verifySeedSignature,
  buildSeedXml,
  seedFromResponse,
  XmlSigError,
  C14N_ALG,
  DS_NS,
  SII_DTE_NS,
} from "./xmlsig";

const fixture = makeTestCertificate();
const material = {
  privateKeyPem: fixture.privateKeyPem,
  certificatePem: fixture.certificatePem,
};

const base: BuildDteInput = {
  tipoDte: 33,
  folio: 27,
  fechaEmision: "2026-09-22",
  emisor: {
    rut: "76543210-3",
    razonSocial: "YELLOW TEST SPA",
    giro: "Software",
    actividadEconomica: "620200",
    direccion: "Av. Ejemplo 123",
    comuna: "Santiago",
  },
  receptor: {
    rut: "12345678-5",
    razonSocial: "Empresas A&B Limitada",
    giro: "Comercio",
    direccion: "Calle 456",
    comuna: "Providencia",
  },
  totales: { neto: 100_000, mntExe: 0, iva: 19_000, total: 119_000 },
  items: [
    { linea: 1, nombre: "Servicio", cantidad: 1, precioUnitario: 100_000, monto: 100_000 },
  ],
  ted: '<TED version="1.0"><DD><RE>76543210-3</RE></DD></TED>',
  tmstFirma: "2026-09-22T15:00:00",
};

function officialSample(): string {
  return readFileSync(
    join(__dirname, "testdata", "F60T33-ejemplo-oficial-SII.xml"),
    "latin1",
  );
}

describe("canonicalize (inclusive C14N)", () => {
  it("sorts attributes and expands empty elements", () => {
    expect(canonicalize('<z b="2" a="1"><x/></z>')).toBe(
      '<z a="1" b="2"><x></x></z>',
    );
  });

  it("renders inherited namespace declarations on the fragment root", () => {
    expect(canonicalize("<a><b/></a>", [["", SII_DTE_NS]])).toBe(
      `<a xmlns="${SII_DTE_NS}"><b></b></a>`,
    );
  });

  it("renders namespace declarations in scope (prefix '' first, then sorted)", () => {
    expect(
      canonicalize('<a xsi:type="t"/>', [
        ["", SII_DTE_NS],
        ["xsi", "http://www.w3.org/2001/XMLSchema-instance"],
      ]),
    ).toBe(
      `<a xmlns="${SII_DTE_NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="t"></a>`,
    );
  });

  it("suppresses redundant identical declarations but keeps changed ones", () => {
    expect(canonicalize('<a xmlns="u"><b xmlns="u">x</b></a>', [["", "u"]])).toBe(
      '<a xmlns="u"><b>x</b></a>',
    );
    expect(canonicalize('<a xmlns="v"><b/></a>', [["", "u"]])).toBe(
      '<a xmlns="v"><b></b></a>',
    );
  });

  it("decodes entities then re-escapes per C14N rules", () => {
    expect(canonicalize("<t>a&amp;b&lt;c&gt;</t>")).toBe("<t>a&amp;b&lt;c&gt;</t>");
    expect(canonicalize('<t a="&quot;q&quot;">d"q</t>')).toBe(
      '<t a="&quot;q&quot;">d"q</t>',
    );
    // Character references survive the round trip as characters.
    expect(canonicalize("<t>&#13;</t>")).toBe("<t>&#xD;</t>");
  });

  it("normalizes line endings before canonicalizing", () => {
    expect(canonicalize("<t>a\r\nb\rc</t>")).toBe("<t>a\nb\nc</t>");
  });

  it("rejects constructions it cannot canonicalize correctly", () => {
    expect(() => canonicalize("<t><!-- no --></t>")).toThrow(XmlSigError);
    expect(() => canonicalize("<t><![CDATA[x]]></t>")).toThrow(XmlSigError);
    expect(() => canonicalize("<a></b>")).toThrow(XmlSigError);
    expect(() => canonicalize("<a>")).toThrow(XmlSigError);
    expect(() => canonicalize("<a></a><b></b>")).toThrow(XmlSigError);
  });
});

describe("official SII example (ground truth)", () => {
  it("reproduces the #SetDoc DigestValue of the official sample", () => {
    const xml = officialSample();
    const start = xml.indexOf("<SetDTE");
    const end = xml.indexOf("</SetDTE>") + "</SetDTE>".length;
    const digest = createHash("sha1")
      .update(
        Buffer.from(
          canonicalize(xml.slice(start, end), [
            ["", SII_DTE_NS],
            ["xsi", "http://www.w3.org/2001/XMLSchema-instance"],
          ]),
          "utf8",
        ),
      )
      .digest("base64");
    expect(digest).toBe("4OTWXyRl5fw3htjTyZXQtYEsC3E=");
  });

  it("reproduces the #Documento DigestValue (2003 tool signed it outside the namespace)", () => {
    // The official example's DTE signature was computed standalone with no
    // xmlns in scope (LibreDTE forensics; see DEPLOY notes). Our builder
    // declares xmlns on <DTE>, so for our documents the standalone and
    // in-envelope contexts coincide and this anomaly never arises.
    const xml = officialSample();
    const start = xml.indexOf("<Documento");
    const end = xml.indexOf("</Documento>") + "</Documento>".length;
    const digest = createHash("sha1")
      .update(Buffer.from(canonicalize(xml.slice(start, end), []), "utf8"))
      .digest("base64");
    expect(digest).toBe("hlmQtu/AyjUjTDhM3852wvRCr8w=");
  });
});

describe("signDteXml", () => {
  it("produces a signature that verifies (digest + RSA-SHA1)", () => {
    const signed = signDteXml(buildDteXml(base), material);
    expect(verifyDteSignature(signed)).toEqual({ digestOk: true, signatureOk: true });
  });

  it("follows the restrictive xmldsignature_v10 structure", () => {
    const signed = signDteXml(buildDteXml(base), material);
    // Exactly one Reference, pointing at the Documento ID.
    expect(signed.match(/<Reference /g)).toHaveLength(1);
    expect(signed).toContain('<Reference URI="#F27T33">');
    // Single C14N transform, fixed algorithms, no attributes on Signature
    // beyond its xmlns (namespace declarations are not attributes per XSD).
    expect(signed).toContain(`<Transform Algorithm="${C14N_ALG}"/>`);
    expect(signed.match(/<Transform /g)).toHaveLength(1);
    expect(signed).toContain(`<SignatureMethod Algorithm="${DS_NS}rsa-sha1"/>`);
    expect(signed).toContain(`<DigestMethod Algorithm="${DS_NS}sha1"/>`);
    expect(signed).toMatch(/<Signature xmlns="[^"]+">/);
    // KeyInfo order: KeyValue (RSAKeyValue) then X509Data.
    const keyValue = signed.indexOf("<KeyValue>");
    const x509Data = signed.indexOf("<X509Data>");
    expect(keyValue).toBeGreaterThan(-1);
    expect(x509Data).toBeGreaterThan(keyValue);
    // Signature sits after </Documento>, inside <DTE>.
    expect(signed.indexOf("</Documento>")).toBeLessThan(signed.indexOf("<Signature"));
    expect(signed.indexOf("<Signature")).toBeLessThan(signed.indexOf("</DTE>"));
  });

  it("flags tampering of the signed content", () => {
    const signed = signDteXml(buildDteXml(base), material);
    const tampered = signed.replace("<MntTotal>119000</MntTotal>", "<MntTotal>1</MntTotal>");
    expect(verifyDteSignature(tampered).digestOk).toBe(false);
  });

  it("rejects XML without a signature slot", () => {
    expect(() => signDteXml("<DTE></DTE>", material)).toThrow(XmlSigError);
  });
});

describe("signEnvioXml", () => {
  it("signs the SetDTE carátula with URI=#SetDoc and verifies", () => {
    const signedDte = signDteXml(buildDteXml(base), material);
    const envio = buildEnvioDte({
      rutEmisor: "76543210-3",
      rutEnvia: "76543210-3",
      fechaResolucion: "2026-09-01",
      numeroResolucion: 0,
      fchFirma: "2026-09-22T15:00:01",
      documentos: [signedDte],
    });
    const signed = signEnvioXml(envio, material);
    expect(verifyEnvioSignature(signed)).toEqual({ digestOk: true, signatureOk: true });
    // The carátula signature references the SetDTE, not the DTE.
    expect(signed).toContain('<Reference URI="#SetDoc">');
    // Both signatures exist: DTE's + envelope's.
    expect(signed.match(/<Signature xmlns=/g)).toHaveLength(2);
    const setClose = signed.indexOf("</SetDTE>");
    const envioSig = signed.lastIndexOf("<Signature");
    expect(envioSig).toBeGreaterThan(setClose);
  });
});

describe("seed (getToken) signing", () => {
  const seedResponse = `<?xml version="1.0" encoding="UTF-8"?>
<SII:RESPUESTA><SEMILLA>987654</SEMILLA><ESTADO>0</ESTADO></SII:RESPUESTA>`;

  it("extracts the seed and reports SII errors with detail", () => {
    expect(seedFromResponse(seedResponse)).toBe("987654");
    expect(() =>
      seedFromResponse("<SII:RESPUESTA><ESTADO>-1</ESTADO><GLOSA>Token inválido</GLOSA></SII:RESPUESTA>"),
    ).toThrow(/Token inválido/);
  });

  it("builds the getToken payload, stripping metacharacters from the seed", () => {
    expect(buildSeedXml("123456")).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        "<getToken><item><Semilla>123456</Semilla></item>" +
        '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignatureValue></SignatureValue></Signature>' +
        "</getToken>",
    );
    expect(buildSeedXml("12<3&4")).toContain("<Semilla>1234</Semilla>");
  });

  it("signs with URI='' and an enveloped transform; verifies round trip", () => {
    const signed = signSeedXml(seedResponse, material);
    expect(signed).toContain('<Reference URI="">');
    expect(signed).toContain(`<Transform Algorithm="${DS_NS}enveloped-signature"/>`);
    expect(signed).not.toContain("<SignatureValue></SignatureValue>");
    expect(verifySeedSignature(signed)).toEqual({ digestOk: true, signatureOk: true });
  });
});

/**
 * XMLDSIG for SII documents, hand-rolled to satisfy the restrictive
 * `xmldsignature_v10.xsd` shipped by the SII:
 *
 *  - `<Signature>` carries no attributes; exactly one `<Reference>`;
 *    Canonicalization/Signature/Digest methods expose only `Algorithm`.
 *  - `KeyInfo` = `<KeyValue><RSAKeyValue>…` then `<X509Data><X509Certificate>`
 *    (both, in that order).
 *  - Inclusive canonicalization REC-xml-c14n-20010315 + RSA-SHA1 + SHA1
 *    (the SII mandates SHA-1).
 *
 * Reference targets follow the official SII example
 * (F60T33-ejemplo-oficial-SII.xml, vendored under `testdata/`):
 *
 *  - DTE signature: `URI="#<Documento@ID>"`, single Transform = C14N,
 *    `<Signature>` placed after `</Documento>` inside `<DTE>`.
 *  - EnvioDTE signature: `URI="#SetDoc"` over `<SetDTE>`, placed at the
 *    end of `<EnvioDTE>`.
 *  - Seed (getToken) signature: `URI=""` with an enveloped-signature
 *    transform — required, because there the signature lives *inside*
 *    the referenced root element.
 *
 * The canonicalizer works directly on our own generated XML: it decodes
 * entities, re-escapes per C14N, expands empty elements, sorts namespace
 * declarations and attributes, normalizes line endings and renders
 * namespace declarations inherited from ancestors on subtree roots —
 * exactly what inclusive C14N produces when the verifier re-parses the
 * document. Anything it does not recognize (CDATA, comments, PIs) is
 * rejected loudly rather than digested incorrectly.
 */

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  X509Certificate,
} from "node:crypto";
import { findTag } from "@/lib/xmlutil";
import { FIRMA_PLACEHOLDER } from "./xml";

export class XmlSigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XmlSigError";
  }
}

export const DS_NS = "http://www.w3.org/2000/09/xmldsig#";
export const C14N_ALG = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
export const SII_DTE_NS = "http://www.sii.cl/SiiDte";
const ENVELOPED_ALG = `${DS_NS}enveloped-signature`;
const SIG_ALG = `${DS_NS}rsa-sha1`;
const DIGEST_ALG = `${DS_NS}sha1`;

export interface SignMaterial {
  privateKeyPem: string;
  certificatePem: string;
}

// ── Entity decoding / C14N escaping ───────────────────────────────────

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeEntities(s: string): string {
  return s.replace(
    /&(amp|lt|gt|quot|apos|#x[0-9A-Fa-f]+|#\d+);/g,
    (match, name: string) => {
      if (name.startsWith("#")) {
        const code = name[1] === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
        return Number.isNaN(code) ? match : String.fromCodePoint(code);
      }
      return NAMED[name];
    },
  );
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r/g, "&#xD;");
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/\t/g, "&#x9;")
    .replace(/\n/g, "&#xA;")
    .replace(/\r/g, "&#xD;");
}

// ── Inclusive C14N over our own XML ───────────────────────────────────

type NsScope = Map<string, string>; // prefix ("" = default) → uri

interface ParsedStart {
  name: string;
  attrs: Array<[string, string]>;
  selfClosing: boolean;
  length: number;
}

function parseStartTag(xml: string, i: number): ParsedStart {
  const m = /^<([^\s/>]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/.exec(xml.slice(i));
  if (!m) {
    throw new XmlSigError(`Tag de inicio inválido: ${xml.slice(i, i + 70)}`);
  }
  const attrs: Array<[string, string]> = [];
  const attrRe = /\s*([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let consumed = 0;
  let am: RegExpExecArray | null;
  while ((am = attrRe.exec(m[2]))) {
    attrs.push([am[1], decodeEntities(am[2] ?? am[3])]);
    consumed = attrRe.lastIndex;
  }
  // NB: a failed exec resets lastIndex to 0, so track the offset manually.
  if (consumed !== m[2].length) {
    throw new XmlSigError(`Atributos mal formados en: ${m[0]}`);
  }
  return { name: m[1], attrs, selfClosing: m[3] === "/", length: m[0].length };
}

/**
 * Canonicalize a single-element fragment under inclusive C14N.
 * `inheritedNs` carries the namespace declarations in scope from ancestors
 * (they must be rendered on the fragment root, like a verifier does when
 * canonicalizing a subtree extracted from the full document).
 */
export function canonicalize(
  fragment: string,
  inheritedNs: Array<[string, string]> = [],
): string {
  // XML parsers normalize line endings before canonicalization.
  const xml = fragment.replace(/\r\n?/g, "\n");
  let out = "";
  let i = 0;
  let rootStarted = false;
  let rootDone = false;
  let scope: NsScope = new Map(inheritedNs);
  const open: Array<{ name: string; parentScope: NsScope }> = [];

  while (i < xml.length) {
    if (rootDone) {
      if (/\s/.test(xml[i])) {
        i += 1;
        continue;
      }
      throw new XmlSigError("El fragmento contiene contenido después de la raíz");
    }
    if (xml.startsWith("</", i)) {
      const m = /^<\/([^\s>]+)\s*>/.exec(xml.slice(i));
      if (!m) throw new XmlSigError(`Cierre de tag inválido: ${xml.slice(i, i + 70)}`);
      const top = open.pop();
      if (!top || top.name !== m[1]) {
        throw new XmlSigError(`Etiquetas desbalanceadas: </${m[1]}>`);
      }
      out += `</${m[1]}>`;
      i += m[0].length;
      scope = top.parentScope;
      if (open.length === 0) rootDone = true;
      continue;
    }
    if (xml[i] === "<") {
      if (xml.startsWith("<?", i) || xml.startsWith("<!", i)) {
        throw new XmlSigError("Construcción XML no soportada (comentario/CDATA/PI)");
      }
      const tag = parseStartTag(xml, i);
      i += tag.length;

      const nsDecls: Array<[string, string]> = [];
      const plainAttrs: Array<[string, string]> = [];
      for (const [name, value] of tag.attrs) {
        if (name === "xmlns") nsDecls.push(["", value]);
        else if (name.startsWith("xmlns:")) nsDecls.push([name.slice(6), value]);
        else plainAttrs.push([name, value]);
      }

      const parentScope = scope;
      const childScope = new Map(parentScope);
      for (const [prefix, uri] of nsDecls) childScope.set(prefix, uri);

      // Namespace nodes to render: everything in scope on the fragment
      // root; on inner elements only the declarations introduced here
      // (redundant identical declarations are suppressed).
      let nsOut: Array<[string, string]>;
      if (!rootStarted) {
        nsOut = [...childScope.entries()];
      } else {
        nsOut = nsDecls.filter(([prefix, uri]) => parentScope.get(prefix) !== uri);
      }
      nsOut.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

      // Attributes: unprefixed first (empty URI), then by (URI, local name).
      const resolved = plainAttrs.map(([name, value]) => {
        const colon = name.indexOf(":");
        if (colon === -1) return { uri: "", local: name, name, value };
        const uri = childScope.get(name.slice(0, colon));
        if (!uri) throw new XmlSigError(`Prefijo de atributo sin declarar: ${name}`);
        return { uri, local: name.slice(colon + 1), name, value };
      });
      resolved.sort(
        (a, b) =>
          (a.uri < b.uri ? -1 : a.uri > b.uri ? 1 : 0) ||
          (a.local < b.local ? -1 : a.local > b.local ? 1 : 0),
      );

      out += `<${tag.name}`;
      for (const [prefix, uri] of nsOut) {
        out += prefix === "" ? ` xmlns="${escapeAttr(uri)}"` : ` xmlns:${prefix}="${escapeAttr(uri)}"`;
      }
      for (const attr of resolved) out += ` ${attr.name}="${escapeAttr(attr.value)}"`;

      if (tag.selfClosing) {
        out += `></${tag.name}>`;
        if (open.length === 0) rootDone = true;
      } else {
        out += ">";
        open.push({ name: tag.name, parentScope });
        scope = childScope;
      }
      rootStarted = true;
      continue;
    }

    // Text node.
    if (!rootStarted) {
      throw new XmlSigError("Texto fuera del elemento raíz");
    }
    const next = xml.indexOf("<", i);
    const end = next === -1 ? xml.length : next;
    const text = decodeEntities(xml.slice(i, end));
    if (text) out += escapeText(text);
    i = end;
    if (i === xml.length) throw new XmlSigError("Fragmento sin cerrar");
  }

  if (!rootStarted || !rootDone) throw new XmlSigError("El fragmento no contiene un elemento raíz cerrado");
  return out;
}

// ── Signing ───────────────────────────────────────────────────────────

interface RefSpec {
  uri: string;
  transforms: string[];
  region: string;
  inheritedNs: Array<[string, string]>;
}

function regionOf(
  xml: string,
  openRe: RegExp,
  closeTag: string,
): { start: number; end: number; openTag: string } {
  const m = openRe.exec(xml);
  if (!m) throw new XmlSigError(`No se encontró ${openRe.source}`);
  const start = m.index;
  const close = xml.indexOf(closeTag, start);
  if (close === -1) throw new XmlSigError(`No se encontró ${closeTag}`);
  return { start, end: close + closeTag.length, openTag: m[0] };
}

function xmlnsOf(openTag: string): string {
  const uri = /\bxmlns="([^"]+)"/.exec(openTag)?.[1];
  if (!uri) throw new XmlSigError(`Elemento sin xmlns: ${openTag}`);
  return uri;
}

function buildSignature(
  uri: string,
  transforms: string[],
  digestB64: string,
  material: SignMaterial,
): string {
  const transformsXml =
    transforms.length > 0
      ? `<Transforms>${transforms.map((a) => `<Transform Algorithm="${a}"/>`).join("")}</Transforms>`
      : "";
  const signedInfo =
    `<SignedInfo>` +
    `<CanonicalizationMethod Algorithm="${C14N_ALG}"/>` +
    `<SignatureMethod Algorithm="${SIG_ALG}"/>` +
    `<Reference URI="${uri}">${transformsXml}` +
    `<DigestMethod Algorithm="${DIGEST_ALG}"/>` +
    `<DigestValue>${digestB64}</DigestValue>` +
    `</Reference>` +
    `</SignedInfo>`;

  // SignedInfo is canonicalized inside <Signature xmlns="…xmldsig#">.
  const c14nSignedInfo = canonicalize(signedInfo, [["", DS_NS]]);
  let signatureValue: string;
  try {
    const key = createPrivateKey(material.privateKeyPem);
    signatureValue = createSign("RSA-SHA1")
      .update(Buffer.from(c14nSignedInfo, "utf8"))
      .sign(key, "base64");
  } catch (err) {
    throw new XmlSigError(
      `No se pudo firmar con la llave privada: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const x509 = new X509Certificate(material.certificatePem);
  const jwk = createPublicKey(material.certificatePem).export({ format: "jwk" }) as {
    n: string;
    e: string;
  };
  const modulus = Buffer.from(jwk.n, "base64url").toString("base64");
  const exponent = Buffer.from(jwk.e, "base64url").toString("base64");

  return (
    `<Signature xmlns="${DS_NS}">` +
    signedInfo +
    `<SignatureValue>${signatureValue}</SignatureValue>` +
    `<KeyInfo><KeyValue><RSAKeyValue>` +
    `<Modulus>${modulus}</Modulus><Exponent>${exponent}</Exponent>` +
    `</RSAKeyValue></KeyValue>` +
    `<X509Data><X509Certificate>${x509.raw.toString("base64")}</X509Certificate></X509Data>` +
    `</KeyInfo></Signature>`
  );
}

function signAndInsert(xml: string, spec: RefSpec, material: SignMaterial): string {
  const placeholderAt = xml.indexOf(FIRMA_PLACEHOLDER);
  if (placeholderAt === -1) throw new XmlSigError("XML sin placeholder de firma");
  // Digest regions never contain the signature itself: for DTE/envío it is
  // a sibling of the referenced element, for the seed it is stripped.
  const region = spec.region.split(FIRMA_PLACEHOLDER).join("");
  const c14n = canonicalize(region, spec.inheritedNs);
  const digest = createHash("sha1").update(Buffer.from(c14n, "utf8")).digest("base64");
  const signature = buildSignature(spec.uri, spec.transforms, digest, material);
  return xml.slice(0, placeholderAt) + signature + xml.slice(placeholderAt + FIRMA_PLACEHOLDER.length);
}

/** Sign a standalone DTE: digest over `<Documento ID="…">`, URI="#ID". */
export function signDteXml(xml: string, material: SignMaterial): string {
  const region = regionOf(xml, /<Documento(\s[^>]*)?>/, "</Documento>");
  const id = /\bID="([^"]+)"/.exec(region.openTag)?.[1];
  if (!id) throw new XmlSigError("<Documento> sin atributo ID");
  const dteOpen = /<DTE(\s[^>]*)?>/.exec(xml);
  if (!dteOpen) throw new XmlSigError("XML sin <DTE>");
  return signAndInsert(
    xml,
    {
      uri: `#${id}`,
      transforms: [C14N_ALG],
      region: xml.slice(region.start, region.end),
      inheritedNs: [["", xmlnsOf(dteOpen[0])]],
    },
    material,
  );
}

/** Sign the envelope: digest over `<SetDTE ID="…">`, URI="#SetDoc". */
export function signEnvioXml(xml: string, material: SignMaterial): string {
  const region = regionOf(xml, /<SetDTE(\s[^>]*)?>/, "</SetDTE>");
  const id = /\bID="([^"]+)"/.exec(region.openTag)?.[1];
  if (!id) throw new XmlSigError("<SetDTE> sin atributo ID");
  const envioOpen = /<EnvioDTE(\s[^>]*)?>/.exec(xml);
  if (!envioOpen) throw new XmlSigError("XML sin <EnvioDTE>");
  return signAndInsert(
    xml,
    {
      uri: `#${id}`,
      transforms: [C14N_ALG],
      region: xml.slice(region.start, region.end),
      inheritedNs: [["", xmlnsOf(envioOpen[0])]],
    },
    material,
  );
}

/** Extract the `<SEMILLA>` from a CrSeed response (or throw with detail). */
export function seedFromResponse(seedResponseXml: string): string {
  const semilla = findTag(seedResponseXml, "SEMILLA")?.trim();
  if (!semilla) {
    const estado = findTag(seedResponseXml, "ESTADO")?.trim();
    const glosa = findTag(seedResponseXml, "GLOSA")?.trim();
    throw new XmlSigError(
      `Respuesta de semilla del SII inválida (${estado ?? "sin estado"})${glosa ? `: ${glosa}` : ""}`,
    );
  }
  return semilla;
}

/** Build the `<getToken>` payload around a seed, with a signature slot. */
export function buildSeedXml(semilla: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<getToken><item><Semilla>${semilla.replace(/[<>&]/g, "")}</Semilla></item>` +
    `${FIRMA_PLACEHOLDER}</getToken>`
  );
}

/**
 * Turn a raw CrSeed response into the signed `<getToken>` XML: URI="",
 * enveloped-signature (the signature lives inside the referenced root).
 */
export function signSeedXml(seedResponseXml: string, material: SignMaterial): string {
  const seedXml = buildSeedXml(seedFromResponse(seedResponseXml));
  const region = regionOf(seedXml, /<getToken(\s[^>]*)?>/, "</getToken>");
  const openTag = region.openTag;
  const xmlns = /\bxmlns="([^"]+)"/.exec(openTag)?.[1];
  return signAndInsert(
    seedXml,
    {
      uri: "",
      transforms: [ENVELOPED_ALG, C14N_ALG],
      region: xmlRegionWithoutSignatures(seedXml, region.start, region.end),
      inheritedNs: xmlns ? [["", xmlns]] : [],
    },
    material,
  );
}

function xmlRegionWithoutSignatures(xml: string, start: number, end: number): string {
  let region = xml.slice(start, end);
  let at: number;
  while ((at = region.indexOf("<Signature")) !== -1) {
    const close = region.indexOf("</Signature>", at);
    if (close === -1) throw new XmlSigError("<Signature> sin cerrar");
    region = region.slice(0, at) + region.slice(close + "</Signature>".length);
  }
  return region;
}

// ── Verification (tests + diagnostics) ────────────────────────────────

export interface VerifyResult {
  digestOk: boolean;
  signatureOk: boolean;
}

function verifyAgainst(
  signatureBlock: string,
  region: string,
  inheritedNs: Array<[string, string]>,
): VerifyResult {
  const digestValue = findTag(signatureBlock, "DigestValue")?.trim();
  const signatureValue = findTag(signatureBlock, "SignatureValue")?.trim();
  const certB64 = findTag(signatureBlock, "X509Certificate")?.replace(/\s+/g, "");
  const signedInfoRaw = /<SignedInfo>[\s\S]*?<\/SignedInfo>/.exec(signatureBlock)?.[0];
  if (!digestValue || !signatureValue || !certB64 || !signedInfoRaw) {
    return { digestOk: false, signatureOk: false };
  }

  const c14n = canonicalize(region, inheritedNs);
  const digestOk =
    createHash("sha1").update(Buffer.from(c14n, "utf8")).digest("base64") === digestValue;

  let signatureOk = false;
  try {
    const cert = new X509Certificate(Buffer.from(certB64, "base64"));
    const c14nSignedInfo = canonicalize(signedInfoRaw, [["", DS_NS]]);
    signatureOk = createVerify("RSA-SHA1")
      .update(Buffer.from(c14nSignedInfo, "utf8"))
      .verify(cert.publicKey, signatureValue, "base64");
  } catch {
    signatureOk = false;
  }
  return { digestOk, signatureOk };
}

function signatureBlockAt(xml: string, from: number): string {
  const start = xml.indexOf("<Signature", from);
  if (start === -1) throw new XmlSigError("XML sin <Signature>");
  const close = xml.indexOf("</Signature>", start);
  if (close === -1) throw new XmlSigError("<Signature> sin cerrar");
  return xml.slice(start, close + "</Signature>".length);
}

/** Verify the signature of a standalone DTE (or of a `<DTE>` inside an envío). */
export function verifyDteSignature(xml: string): VerifyResult {
  const region = regionOf(xml, /<Documento(\s[^>]*)?>/, "</Documento>");
  const dteOpen = /<DTE(\s[^>]*)?>/.exec(xml);
  if (!dteOpen) throw new XmlSigError("XML sin <DTE>");
  const block = signatureBlockAt(xml, region.end);
  return verifyAgainst(
    block,
    xml.slice(region.start, region.end),
    [["", xmlnsOf(dteOpen[0])]],
  );
}

/** Verify the envelope's carátula signature over `<SetDTE>`. */
export function verifyEnvioSignature(xml: string): VerifyResult {
  const region = regionOf(xml, /<SetDTE(\s[^>]*)?>/, "</SetDTE>");
  const envioOpen = /<EnvioDTE(\s[^>]*)?>/.exec(xml);
  if (!envioOpen) throw new XmlSigError("XML sin <EnvioDTE>");
  const block = signatureBlockAt(xml, region.end);
  return verifyAgainst(
    block,
    xml.slice(region.start, region.end),
    [["", xmlnsOf(envioOpen[0])]],
  );
}

/** Verify a signed `<getToken>` seed payload (URI="", enveloped). */
export function verifySeedSignature(xml: string): VerifyResult {
  const region = regionOf(xml, /<getToken(\s[^>]*)?>/, "</getToken>");
  const block = signatureBlockAt(xml, region.start);
  const xmlns = /\bxmlns="([^"]+)"/.exec(region.openTag)?.[1];
  return verifyAgainst(
    block,
    xmlRegionWithoutSignatures(xml, region.start, region.end),
    xmlns ? [["", xmlns]] : [],
  );
}

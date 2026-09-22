import { createVerify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseCaf } from "./caf";
import { cafFixtureXml, publicKey } from "./fixtures";
import { buildTed, buildTedDd } from "./ted";
import type { TedInput } from "./ted";

const caf = parseCaf(cafFixtureXml());

const input: TedInput = {
  rutEmisor: "76543210-3",
  tipoDte: 33,
  folio: 27,
  fecha: "2026-09-22",
  rutReceptor: "12345678-5",
  razonSocialReceptor: "Empresas A&B Limitada",
  mntTotal: 119_000,
  primerItem: "Servicio de desarrollo",
  tstEd: "2026-09-22T15:00:00",
  cafXml: caf.cafXml,
  rsaskPem: caf.rsaskPem,
};

describe("buildTedDd", () => {
  it("contains the representative fields in SII order", () => {
    const dd = buildTedDd(input);
    expect(dd).toMatch(
      /^<DD><RE>76543210-3<\/RE><TD>33<\/TD><F>27<\/F><FE>2026-09-22<\/FE>/,
    );
    expect(dd).toContain("<RR>12345678-5</RR>");
    expect(dd).toContain("<MNT>119000</MNT>");
    expect(dd).toContain("<TSTED>2026-09-22T15:00:00</TSTED>");
    expect(dd).toContain('<CAF version="1.0">');
    expect(dd.endsWith("</DD>")).toBe(true);
  });

  it("escapes XML entities in the receptor name", () => {
    const dd = buildTedDd(input);
    expect(dd).toContain("<RSR>Empresas A&amp;B Limitada</RSR>");
    expect(dd).not.toContain("A&B");
  });

  it("truncates RSR and IT1 to 40 characters", () => {
    const dd = buildTedDd({
      ...input,
      razonSocialReceptor: "X".repeat(60),
      primerItem: "Y".repeat(60),
    });
    expect(dd).toContain(`<RSR>${"X".repeat(40)}</RSR>`);
    expect(dd).toContain(`<IT1>${"Y".repeat(40)}</IT1>`);
  });
});

describe("buildTed", () => {
  it("signs the DD payload with the CAF key (RSA-SHA1 verifiable)", () => {
    const ted = buildTed(input);
    const dd = ted.match(/<DD>[\s\S]*?<\/DD>/)?.[0];
    expect(dd).toBeTruthy();

    const frmt = ted.match(/<FRMT algoritmo="SHA1withRSA">([^<]+)<\/FRMT>/)?.[1];
    expect(frmt).toBeTruthy();

    const verifier = createVerify("RSA-SHA1");
    verifier.update(Buffer.from(dd!, "latin1"));
    expect(verifier.verify(publicKey, frmt!, "base64")).toBe(true);
  });

  it("embeds the CAF unmodified and keeps the SII wrapper structure", () => {
    const ted = buildTed(input);
    expect(ted.startsWith('<TED version="1.0">')).toBe(true);
    expect(ted).toContain(caf.cafXml);
    expect(ted.trimEnd().endsWith("</TED>")).toBe(true);
  });

  it("changes signature when the payload changes", () => {
    const sig1 = buildTed(input).match(/<FRMT[^>]*>([^<]+)/)?.[1];
    const sig2 = buildTed({ ...input, folio: 28 }).match(/<FRMT[^>]*>([^<]+)/)?.[1];
    expect(sig1).not.toBe(sig2);
  });
});

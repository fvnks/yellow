import { describe, expect, it } from "vitest";
import { cafIncludesFolio, CafParseError, parseCaf } from "./caf";
import { cafFixtureXml, rawBase64 } from "./fixtures";

describe("parseCaf", () => {
  it("extracts emisor, type, folio range and a usable PEM key", () => {
    const caf = parseCaf(cafFixtureXml());
    expect(caf.rutEmisor).toBe("765432103");
    expect(caf.razonSocial).toBe("YELLOW TEST SPA");
    expect(caf.tipoDte).toBe(33);
    expect(caf.folioDesde).toBe(1000);
    expect(caf.folioHasta).toBe(1999);
    expect(caf.fechaAutorizacion).toBe("2026-09-01");
    expect(caf.rsaskPem).toContain("BEGIN RSA PRIVATE KEY");
    expect(caf.cafXml).toContain('<CAF version="1.0">');
    expect(caf.cafXml).toContain("firmaDelSii");
  });

  it("wraps raw base64 RSASK into PEM headers", () => {
    const caf = parseCaf(cafFixtureXml({ rsask: `  ${rawBase64}  ` }));
    expect(caf.rsaskPem).toContain("BEGIN RSA PRIVATE KEY");
    expect(caf.rsaskPem.replace(/\s/g, "")).toContain(rawBase64.slice(0, 32));
  });

  it("rejects non-CAF input", () => {
    expect(() => parseCaf("<otro>x</otro>")).toThrow(CafParseError);
  });

  it("rejects an invalid emisor RUT", () => {
    // Correct DV for 12.345.678 is 5 → -9 is invalid.
    expect(() => parseCaf(cafFixtureXml({ rut: "12.345.678-9" }))).toThrow(
      /RUT emisor inválido/,
    );
  });

  it("rejects a broken folio range", () => {
    expect(() => parseCaf(cafFixtureXml({ d: "2000", h: "1000" }))).toThrow(
      /rango de folios/,
    );
  });

  it("rejects an unparsable RSASK", () => {
    expect(() => parseCaf(cafFixtureXml({ rsask: "no-es-clave" }))).toThrow(
      /RSASK/,
    );
  });
});

describe("cafIncludesFolio", () => {
  it("checks range boundaries inclusively", () => {
    const caf = parseCaf(cafFixtureXml());
    expect(cafIncludesFolio(caf, 1000)).toBe(true);
    expect(cafIncludesFolio(caf, 1500)).toBe(true);
    expect(cafIncludesFolio(caf, 1999)).toBe(true);
    expect(cafIncludesFolio(caf, 999)).toBe(false);
    expect(cafIncludesFolio(caf, 2000)).toBe(false);
  });
});

/**
 * Formato del Libro de Compras y Ventas (IECV): totales por tipo de
 * documento, filtros de estado, escaping y — si hay validador XSD
 * disponible — validación del XML generado contra el esquema oficial
 * LibroCVS_v10.xsd (vendored en ./xsd).
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { agruparPorTipo, buildLibroXml, documentosLibro } from "./libro";
import type { BuildLibroInput, LibroDocumento } from "./libro";
import { findValidator } from "./xsd-validator";

const XSD_DIR = join(dirname(fileURLToPath(import.meta.url)), "xsd");

const VENTAS: LibroDocumento[] = [
  {
    tipoDte: 33,
    folio: 1000,
    fechaEmision: new Date(2026, 8, 5),
    contraparteRut: "12345678-5",
    contraparteRazonSocial: "Cliente & Cía <SpA>",
    neto: 100_000,
    mntExe: 0,
    iva: 19_000,
    total: 119_000,
    estado: "ACEPTADO",
  },
  {
    tipoDte: 33,
    folio: 1001,
    fechaEmision: new Date(2026, 8, 10),
    contraparteRut: "12345678-5",
    contraparteRazonSocial: "Cliente SpA",
    neto: 50_000,
    mntExe: 0,
    iva: 9_500,
    total: 59_500,
    estado: "ANULADO",
  },
  {
    tipoDte: 34,
    folio: 1002,
    fechaEmision: new Date(2026, 8, 12),
    contraparteRut: "12345678-5",
    contraparteRazonSocial: "Exenta Ltda",
    neto: 0,
    mntExe: 40_000,
    iva: 0,
    total: 40_000,
    estado: "ACEPTADO",
  },
  {
    tipoDte: 61,
    folio: 4,
    fechaEmision: new Date(2026, 8, 15),
    contraparteRut: "12345678-5",
    contraparteRazonSocial: "Cliente SpA",
    neto: -100_000,
    mntExe: 0,
    iva: -19_000,
    total: -119_000,
    estado: "ACEPTADO",
  },
  // Borrador y doc sin folio: no deben aparecer en el libro.
  {
    tipoDte: 33,
    folio: 1003,
    fechaEmision: new Date(2026, 8, 20),
    contraparteRut: "12345678-5",
    contraparteRazonSocial: "Borrador",
    neto: 10_000,
    mntExe: 0,
    iva: 1_900,
    total: 11_900,
    estado: "BORRADOR",
  },
  {
    tipoDte: 33,
    folio: null,
    fechaEmision: new Date(2026, 8, 21),
    contraparteRut: "12345678-5",
    contraparteRazonSocial: "Sin folio",
    neto: 20_000,
    mntExe: 0,
    iva: 3_800,
    total: 23_800,
    estado: "ACEPTADO",
  },
];

function input(documentos: LibroDocumento[]): BuildLibroInput {
  return {
    sentido: "VENTA",
    periodo: "2026-09",
    rutEmisor: "76543210-3",
    fechaResolucion: "2026-01-15",
    numeroResolucion: 12345,
    tmstFirma: "2026-10-01T10:00:00",
    documentos,
  };
}

const xmlVentas = buildLibroXml(input(VENTAS));
const xmlCompras = buildLibroXml({ ...input(VENTAS), sentido: "COMPRA" });

function contenido(tag: string, xml: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, "g"))].map(
    (m) => m[1],
  );
}

describe("documentosLibro", () => {
  it("excluye estados no definitivos y documentos sin folio", () => {
    const docs = documentosLibro(VENTAS);
    expect(docs).toHaveLength(4);
    expect(docs.map((d) => d.folio)).not.toContain(1003);
    expect(docs.every((d) => d.folio != null)).toBe(true);
  });

  it("ordena por fecha de emisión y luego por folio", () => {
    const docs = documentosLibro(VENTAS);
    const fechas = docs.map((d) => d.fechaEmision.getTime());
    expect(fechas).toEqual([...fechas].sort((a, b) => a - b));
  });
});

describe("agruparPorTipo", () => {
  it("suma por tipo incluyendo anulados y marca TotAnulado", () => {
    const porTipo = agruparPorTipo(VENTAS);
    const f33 = porTipo.find((g) => g.tipoDte === 33)!;
    // 1000 (aceptada) + 1001 (anulada); 1003 (borrador) y sin folio fuera.
    expect(f33.totDoc).toBe(2);
    expect(f33.totAnulado).toBe(1);
    expect(f33.totMntNeto).toBe(150_000);
    expect(f33.totMntIva).toBe(28_500);
    expect(f33.totMntTotal).toBe(178_500);
    expect(f33.totOpExe).toBe(0);
    expect(f33.totOpIvaRec).toBe(2);
  });

  it("cuenta operaciones exentas en facturas exentas", () => {
    const f34 = agruparPorTipo(VENTAS).find((g) => g.tipoDte === 34)!;
    expect(f34.totOpExe).toBe(1);
    expect(f34.totMntExe).toBe(40_000);
    expect(f34.totOpIvaRec).toBe(0);
  });

  it("conserva montos negativos de las notas de crédito", () => {
    const nc = agruparPorTipo(VENTAS).find((g) => g.tipoDte === 61)!;
    expect(nc.totMntNeto).toBe(-100_000);
    expect(nc.totMntTotal).toBe(-119_000);
  });
});

describe("buildLibroXml", () => {
  it("arma la carátula con periodo, resolución y tipo de operación", () => {
    expect(xmlVentas).toContain("<RutEmisorLibro>76543210-3</RutEmisorLibro>");
    expect(xmlVentas).toContain("<PeriodoTributario>2026-09</PeriodoTributario>");
    expect(xmlVentas).toContain("<FchResol>2026-01-15</FchResol>");
    expect(xmlVentas).toContain("<NroResol>12345</NroResol>");
    expect(xmlVentas).toContain("<TipoOperacion>VENTA</TipoOperacion>");
    expect(xmlVentas).toContain("<TipoLibro>MENSUAL</TipoLibro>");
    expect(xmlVentas).toContain("<TipoEnvio>TOTAL</TipoEnvio>");
    expect(xmlVentas).toContain("<TmstFirma>2026-10-01T10:00:00</TmstFirma>");
    expect(xmlVentas).toContain('ID="LibroCV-VENTA-2026-09"');
  });

  it("solo emite TpoImp en el libro de compras", () => {
    expect(xmlCompras).toContain("<TipoOperacion>COMPRA</TipoOperacion>");
    expect(xmlCompras).toContain("<TpoImp>1</TpoImp>");
    expect(xmlVentas).not.toContain("<TpoImp>");
  });

  it("escribe un Detalle por documento del libro (4 de 6)", () => {
    expect(contenido("NroDoc", xmlVentas).sort()).toEqual(["1000", "1001", "1002", "4"]);
    expect(xmlVentas).not.toContain(">1003<");
  });

  it("marca los documentos anulados con <Anulado>A</Anulado>", () => {
    expect(xmlVentas).toContain("<Anulado>A</Anulado>");
    expect((xmlVentas.match(/<Anulado>/g) ?? []).length).toBe(1);
  });

  it("escapa caracteres XML en la razón social", () => {
    expect(xmlVentas).toContain("Cliente &amp; Cía &lt;SpA&gt;");
  });

  it("trunca la razón social a los 50 caracteres del XSD", () => {
    const xml = buildLibroXml(
      input([
        {
          ...VENTAS[0],
          contraparteRazonSocial: "R".repeat(60),
        },
      ]),
    );
    const razon = contenido("RznSoc", xml)[0];
    expect(razon).toHaveLength(50);
  });

  it("el ResumenPeriodo cuadra con los Detalle", () => {
    expect(xmlVentas).toContain("<TotMntNeto>150000</TotMntNeto>");
    expect(xmlVentas).toContain("<TotMntExe>40000</TotMntExe>");
    expect(xmlVentas).toContain("<TotMntNeto>-100000</TotMntNeto>");
    expect(xmlVentas).toContain("<TotAnulado>1</TotAnulado>");
    expect(xmlVentas).toContain("<TotDoc>2</TotDoc>");
  });

  it("genera resumen solo con tipos presentes y sin resumen si no hay docs", () => {
    const vacio = buildLibroXml(input([]));
    expect(vacio).not.toContain("<ResumenPeriodo>");
    expect(vacio).not.toContain("<Detalle>");
    expect(vacio).toContain("<Caratula>");
    expect(vacio).toContain("<TmstFirma>");
    const tipos = contenido("TpoDoc", xmlVentas);
    // TpoDoc del resumen (3 por tipo) + de cada Detalle (4).
    expect(tipos.filter((t) => t === "33").length).toBeGreaterThan(1);
  });

  it("rechaza la carátula inválida con mensaje claro", () => {
    expect(() => buildLibroXml({ ...input([]), periodo: "2026-13" })).toThrow(
      /Periodo inválido/,
    );
    expect(() =>
      buildLibroXml({ ...input([]), fechaResolucion: "15-01-2026" }),
    ).toThrow(/Fecha de resolución inválida/);
    expect(() =>
      buildLibroXml({ ...input([]), numeroResolucion: 1_000_000 }),
    ).toThrow(/6 dígitos/);
    expect(() => buildLibroXml({ ...input([]), rutEmisor: "sin rut" })).toThrow(
      /RUT del emisor inválido/,
    );
    expect(() =>
      buildLibroXml({ ...input([]), sentido: "OTRO" as never }),
    ).toThrow(/Tipo de operación inválido/);
  });

  it("normaliza el RUT al formato XML con guion (la BD guarda sólo dígitos)", () => {
    const xml = buildLibroXml({ ...input(VENTAS), rutEmisor: "765432103" });
    expect(xml).toContain("<RutEmisorLibro>76543210-3</RutEmisorLibro>");
    const sinGuion = VENTAS.map((d) => ({
      ...d,
      contraparteRut: d.contraparteRut
        ? d.contraparteRut.replace("-", "")
        : null,
    }));
    const xml2 = buildLibroXml(input(sinGuion));
    expect(xml2).toContain("<RUTDoc>12345678-5</RUTDoc>");
    expect(xml2).not.toContain("<RUTDoc>123456785</RUTDoc>");
  });

  it("rechaza RUT de contraparte inválido nombrando el folio", () => {
    expect(() =>
      buildLibroXml(
        input([{ ...VENTAS[0], contraparteRut: "no-es-rut" }]),
      ),
    ).toThrow(/folio 1000/);
  });
});

// ── Validación contra el XSD oficial (se omite sin validador) ──
const validate = findValidator();

describe.skipIf(validate === null)("XSD oficial LibroCVS_v10", () => {
  let dir = "";

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "libro-xsd-"));
    // Bytes como se sirven/suben: ISO-8859-1.
    writeFileSync(join(dir, "libro-ventas.xml"), Buffer.from(xmlVentas, "latin1"));
    writeFileSync(join(dir, "libro-compras.xml"), Buffer.from(xmlCompras, "latin1"));
  });

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("el libro de ventas generado valida", () => {
    validate!(join(XSD_DIR, "LibroCVS_v10.xsd"), join(dir, "libro-ventas.xml"));
  });

  it("el libro de compras generado valida", () => {
    validate!(join(XSD_DIR, "LibroCVS_v10.xsd"), join(dir, "libro-compras.xml"));
  });
});

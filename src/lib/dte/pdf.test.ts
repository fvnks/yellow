import { describe, expect, it } from "vitest";
import { extraerDatosDte, pdfDesdeXml, PdfError } from "./pdf";

/**
 * XML de referencia con los mismos patrones que emite `buildDteXml`
 * (sin prefijos, ISO-8859-1, entidades), incluido el orden
 * TasaIVA → IVA que confunde a un extractor ingenuo.
 */
function xmlDte(opts?: { items?: number; sinFolio?: boolean }): string {
  const n = opts?.items ?? 2;
  const detalle = Array.from({ length: n }, (_, i) =>
    [
      `<Detalle>`,
      `<NroLinDet>${i + 1}</NroLinDet>`,
      `<NmbItem>${i === 0 ? "Servicio de asesoría" : `Insumo ${i}`}</NmbItem>`,
      `<QtyItem>${i === 0 ? "1" : "2.5"}</QtyItem>`,
      `<PrcItem>${i === 0 ? "1000000" : "400"}</PrcItem>`,
      `<MontoItem>${i === 0 ? "1000000" : "1000"}</MontoItem>`,
      `</Detalle>`,
    ].join("\n"),
  ).join("\n");

  return [
    `<?xml version="1.0" encoding="ISO-8859-1"?>`,
    `<DTE xmlns="http://www.sii.cl/SiiDte" version="1.0">`,
    `<Documento ID="F1004T33">`,
    `<Encabezado>`,
    `<IdDoc>`,
    `<TipoDTE>33</TipoDTE>`,
    ...(opts?.sinFolio ? [] : [`<Folio>1004</Folio>`]),
    `<FchEmis>2026-09-22</FchEmis>`,
    `</IdDoc>`,
    `<Emisor>`,
    `<RUTEmisor>76543210-3</RUTEmisor>`,
    `<RznSoc>Viñedos Ñuble SpA</RznSoc>`,
    `<GiroEmis>Elaboración de vinos</GiroEmis>`,
    `<DirOrigen>Av. Providencia 1234</DirOrigen>`,
    `<CmnaOrigen>Providencia</CmnaOrigen>`,
    `</Emisor>`,
    `<Receptor>`,
    `<RUTRecep>12345678-5</RUTRecep>`,
    `<RznSocRecep>Señores &amp; Cía Limitada</RznSocRecep>`,
    `<DirRecep>Santiago</DirRecep>`,
    `<CmnaRecep>Santiago</CmnaRecep>`,
    `</Receptor>`,
    `<Totales>`,
    `<MntNeto>1001000</MntNeto>`,
    `<TasaIVA>19</TasaIVA>`,
    `<IVA>190190</IVA>`,
    `<MntTotal>1191190</MntTotal>`,
    `</Totales>`,
    `</Encabezado>`,
    detalle,
    `<Referencia>`,
    `<NroLinRef>1</NroLinRef>`,
    `<TpoDocRef>33</TpoDocRef>`,
    `<FolioRef>900</FolioRef>`,
    `<CodRef>1</CodRef>`,
    `<RazonRef>Documento de prueba</RazonRef>`,
    `</Referencia>`,
    `<TmstFirma>2026-09-22T15:04:05</TmstFirma>`,
    `</Documento>`,
    `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">`,
    `<SignatureValue>abc123==</SignatureValue>`,
    `</Signature>`,
    `</DTE>`,
  ].join("\n");
}

describe("extraerDatosDte", () => {
  it("lee identificación, emisor, receptor y totales", () => {
    const d = extraerDatosDte(xmlDte());
    expect(d.tipoDte).toBe(33);
    expect(d.folio).toBe(1004);
    expect(d.fecha).toBe("2026-09-22");
    expect(d.emisor.rut).toBe("76543210-3");
    expect(d.emisor.razonSocial).toBe("Viñedos Ñuble SpA");
    expect(d.receptor.rut).toBe("12345678-5");
    // Entidades XML decodificadas.
    expect(d.receptor.razonSocial).toBe("Señores & Cía Limitada");
    expect(d.totales.neto).toBe(1001000);
    expect(d.totales.iva).toBe(190190); // no "19" (TasaIVA)
    expect(d.totales.total).toBe(1191190);
    expect(d.tmstFirma).toBe("2026-09-22T15:04:05");
  });

  it("lee todas las líneas de detalle y las referencias", () => {
    const d = extraerDatosDte(xmlDte({ items: 3 }));
    expect(d.items).toHaveLength(3);
    expect(d.items[0].nombre).toBe("Servicio de asesoría");
    expect(d.items[1].cantidad).toBe(2.5);
    expect(d.referencias).toHaveLength(1);
    expect(d.referencias[0]).toContain("N° 900");
  });

  it("rechaza un XML sin Folio", () => {
    expect(() => extraerDatosDte(xmlDte({ sinFolio: true }))).toThrow(PdfError);
  });
});

describe("pdfDesdeXml", () => {
  it("produce un PDF estructuralmente válido", () => {
    const pdf = pdfDesdeXml(xmlDte());
    const texto = pdf.toString("latin1");

    expect(texto.startsWith("%PDF-1.4\n")).toBe(true);
    expect(texto.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(texto).toContain("xref");
    expect(texto).toContain("trailer");
    expect(texto).toContain("/Root 1 0 R");
    expect(texto).toContain("/BaseFont /Helvetica-Bold");
    expect(texto).toContain("/WinAnsiEncoding");

    // startxref apunta exactamente al inicio de la tabla xref.
    const m = /startxref\n(\d+)\n/.exec(texto);
    expect(m).not.toBeNull();
    expect(texto.slice(Number(m![1]), Number(m![1]) + 4)).toBe("xref");
  });

  it("incluye encabezado, montos formateados y acentos WinAnsi", () => {
    const texto = pdfDesdeXml(xmlDte()).toString("latin1");

    expect(texto).toContain("Factura Electrónica N° 1004"); // é=0xE9, °=0xB0 en WinAnsi
    expect(texto).toContain("76543210-3");
    expect(texto).toContain("12345678-5");
    // es-CL: 1.191.190
    expect(texto).toContain("$1.191.190");
    expect(texto).toContain("$1.001.000");
    // Ñ (0xD1) y ñ (0xF1) literales en WinAnsi.
    expect(pdfDesdeXml(xmlDte()).includes(Buffer.from("Vi\xF1edos \xD1uble", "latin1"))).toBe(true);
    // Entidad decodificada en el PDF.
    expect(texto).toContain("Señores & Cía Limitada");
  });

  it("pagina documentos largos", () => {
    const una = pdfDesdeXml(xmlDte());
    const larga = pdfDesdeXml(xmlDte({ items: 80 }));
    const paginas = (b: Buffer) =>
      (b.toString("latin1").match(/\/Type \/Page[^s]/g) ?? []).length;
    expect(paginas(una)).toBe(1);
    expect(paginas(larga)).toBeGreaterThan(1);
    expect(larga.length).toBeGreaterThan(una.length);
  });

  it("rechaza un XML incompleto", () => {
    expect(() => pdfDesdeXml("<DTE><Documento></Documento></DTE>")).toThrow(PdfError);
  });
});

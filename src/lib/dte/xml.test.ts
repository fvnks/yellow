import { describe, expect, it } from "vitest";
import { buildDteXml, buildEnvioDte, esc } from "./xml";
import type { BuildDteInput } from "./xml";

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
    email: "compras@ejemplo.com",
  },
  totales: { neto: 100_000, mntExe: 0, iva: 19_000, total: 119_000 },
  items: [
    { linea: 1, nombre: "Servicio", cantidad: 1, precioUnitario: 100_000, monto: 100_000 },
  ],
  ted: "<TED version=\"1.0\"><DD/></TED>",
  tmstFirma: "2026-09-22T15:00:00",
};

describe("esc", () => {
  it("escapes the five predefined entities", () => {
    expect(esc(`A&B <c> "q" 'x'"`)).toBe(
      "A&amp;B &lt;c&gt; &quot;q&quot; &apos;x&apos;&quot;",
    );
  });
});

describe("buildDteXml", () => {
  it("declares ISO-8859-1, the SiiDte namespace and a stable Documento ID", () => {
    const xml = buildDteXml(base);
    expect(xml.startsWith('<?xml version="1.0" encoding="ISO-8859-1"?>')).toBe(true);
    expect(xml).toContain('<DTE xmlns="http://www.sii.cl/SiiDte" version="1.0">');
    expect(xml).toContain('<Documento ID="F27T33">');
    expect(xml.trimEnd().endsWith("</DTE>")).toBe(true);
  });

  it("places the signature placeholder after </Documento>, inside <DTE>", () => {
    const xml = buildDteXml(base);
    const docClose = xml.indexOf("</Documento>");
    const sig = xml.indexOf("<Signature");
    const dteClose = xml.indexOf("</DTE>");
    expect(docClose).toBeGreaterThan(-1);
    expect(sig).toBeGreaterThan(docClose);
    expect(sig).toBeLessThan(dteClose);
  });

  it("emits Encabezado sections with emisor, receptor and totals", () => {
    const xml = buildDteXml(base);
    expect(xml).toContain("<TipoDTE>33</TipoDTE>");
    expect(xml).toContain("<Folio>27</Folio>");
    expect(xml).toContain("<RUTEmisor>76543210-3</RUTEmisor>");
    expect(xml).toContain("<Acteco>620200</Acteco>");
    expect(xml).toContain("<RUTRecep>12345678-5</RUTRecep>");
    expect(xml).toContain("<MntNeto>100000</MntNeto>");
    expect(xml).toContain("<TasaIVA>19</TasaIVA>");
    expect(xml).toContain("<IVA>19000</IVA>");
    expect(xml).toContain("<MntTotal>119000</MntTotal>");
  });

  it("escapes receptor razón social", () => {
    expect(buildDteXml(base)).toContain(
      "<RznSocRecep>Empresas A&amp;B Limitada</RznSocRecep>",
    );
  });

  it("marks exempt lines with IndExe and accumulates MntExe", () => {
    const xml = buildDteXml({
      ...base,
      totales: { neto: 10_000, mntExe: 4_000, iva: 1_900, total: 15_900 },
      items: [
        { linea: 1, nombre: "Afecto", cantidad: 1, precioUnitario: 10_000, monto: 10_000 },
        { linea: 2, nombre: "Exento", cantidad: 1, precioUnitario: 4_000, afectoIva: false, monto: 4_000 },
      ],
    });
    expect(xml).toContain("<IndExe>1</IndExe>");
    expect(xml).toContain("<MntExe>4000</MntExe>");
  });

  it("omits IVA fields for exenta facturas (tipo 34)", () => {
    const xml = buildDteXml({
      ...base,
      tipoDte: 34,
      totales: { neto: 0, mntExe: 10_000, iva: 0, total: 10_000 },
    });
    expect(xml).toContain("<MntExe>10000</MntExe>");
    expect(xml).not.toContain("<TasaIVA>");
    expect(xml).not.toContain("<IVA>");
    expect(xml).toContain('<Documento ID="F27T34">');
  });

  it("formats quantities without trailing zeros and adds DscRng for discounts", () => {
    const xml = buildDteXml({
      ...base,
      items: [
        {
          linea: 1,
          nombre: "Kilos",
          cantidad: 2.5,
          precioUnitario: 999,
          descuento: 100,
          monto: 2498,
        },
      ],
    });
    expect(xml).toContain("<CantItem>2.5</CantItem>");
    expect(xml).toContain("<MontoItem>2498</MontoItem>");
    expect(xml).toContain(
      "<DscRng><NroLinDR>1</NroLinDR><GlosaDR>Descuento</GlosaDR><TpoMov>D</TpoMov><ValorDR>100</ValorDR></DscRng>",
    );
  });

  it("adds IndTraslado only for guías de despacho (52)", () => {
    expect(buildDteXml({ ...base, tipoTraslado: 4 })).not.toContain("<IndTraslado>");
    const guia = buildDteXml({ ...base, tipoDte: 52, tipoTraslado: 4 });
    expect(guia).toContain("<IndTraslado>4</IndTraslado>");
  });

  it("renders references for notas de crédito (61)", () => {
    const xml = buildDteXml({
      ...base,
      tipoDte: 61,
      references: [
        {
          tipoDteRef: 33,
          folioRef: 26,
          fechaRef: "2026-09-01",
          codigoRef: 1,
          motivo: "Anula factura",
        },
      ],
    });
    expect(xml).toContain("<TpoDocRef>33</TpoDocRef>");
    expect(xml).toContain("<FolioRef>26</FolioRef>");
    expect(xml).toContain("<CodRef>1</CodRef>");
    expect(xml).toContain("<RazonRef>Anula factura</RazonRef>");
  });

  it("includes the TED, timestamp and a signature placeholder by default", () => {
    const xml = buildDteXml(base);
    expect(xml).toContain(base.ted);
    expect(xml).toContain("<TmstFirma>2026-09-22T15:00:00</TmstFirma>");
    expect(xml).toContain('xmlns="http://www.w3.org/2000/09/xmldsig#"');
  });

  it("uses a custom firma when provided", () => {
    const xml = buildDteXml({ ...base, firma: "<Signature>firma</Signature>" });
    expect(xml).toContain("<Signature>firma</Signature>");
    expect(xml).not.toContain("<SignatureValue></SignatureValue>");
  });
});

describe("buildEnvioDte", () => {
  it("builds the carátula with per-type totals and embeds the DTEs", () => {
    const dte = buildDteXml(base);
    const envio = buildEnvioDte({
      rutEmisor: "76543210-3",
      rutEnvia: "76543210-3",
      fechaResolucion: "2026-09-01",
      numeroResolucion: 0,
      fchFirma: "2026-09-22T15:00:01",
      documentos: [dte],
    });
    expect(envio).toContain('<EnvioDTE version="1.0" xmlns="http://www.sii.cl/SiiDte">');
    expect(envio).toContain("<RutEmisor>76543210-3</RutEmisor>");
    expect(envio).toContain("<RutReceptor>66666666-6</RutReceptor>");
    expect(envio).toContain("<SubTotDTE><TpoDTE>33</TpoDTE><NroDTE>1</NroDTE></SubTotDTE>");
    expect(envio).toContain('<Documento ID="F27T33">');
    expect(envio.trimEnd().endsWith("</EnvioDTE>")).toBe(true);
  });

  it("embeds DTEs as fragments (no nested XML declaration)", () => {
    const dte = buildDteXml(base);
    const envio = buildEnvioDte({
      rutEmisor: "76543210-3",
      rutEnvia: "76543210-3",
      fechaResolucion: "2026-09-01",
      numeroResolucion: 0,
      fchFirma: "2026-09-22T15:00:01",
      documentos: [dte],
    });
    // Exactly one declaration: the envelope's own.
    expect(envio.match(/<\?xml/g)).toHaveLength(1);
    expect(envio).toContain("<DTE xmlns=");
  });

  it("follows EnvioDTE_v10: no FchFirma, signature after SetDTE", () => {
    const dte = buildDteXml(base);
    const envio = buildEnvioDte({
      rutEmisor: "76543210-3",
      rutEnvia: "76543210-3",
      fechaResolucion: "2026-09-01",
      numeroResolucion: 0,
      fchFirma: "2026-09-22T15:00:01",
      documentos: [dte],
    });
    expect(envio).not.toContain("<FchFirma>");
    expect(envio).toContain("<TmstFirmaEnv>2026-09-22T15:00:01</TmstFirmaEnv>");
    const setClose = envio.lastIndexOf("</SetDTE>");
    const envioSig = envio.lastIndexOf("<Signature");
    expect(envioSig).toBeGreaterThan(setClose);
    // The envelope's own placeholder must be the LAST empty SignatureValue.
    const placeholders = envio.match(/<SignatureValue><\/SignatureValue>/g) ?? [];
    expect(placeholders.length).toBe(2); // DTE + carátula
  });
});

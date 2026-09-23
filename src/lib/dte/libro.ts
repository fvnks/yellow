/**
 * Libro de Compras y Ventas (Información Electrónica de Compras y
 * Ventas — IECV) en el formato XML oficial del SII.
 *
 * Esquema: LibroCVS_v10.xsd (vendored en ./xsd, autocontenido — sin
 * imports — bajado de sii.cl: schema_iecv.zip / esquema_libro_cvs.zip).
 * El archivo generado se sube en Declaraciones Juradas → "Upload XML de
 * libros de compra y venta".
 *
 * Orden obligatorio de elementos según el XSD:
 *   LibroCompraVenta
 *     └ EnvioLibro{ Caratula, ResumenSegmento?, ResumenPeriodo?, Detalle*, TmstFirma }
 *
 * Decisiones:
 *  - Solo entran documentos ACEPTADO y ANULADO con folio: los borradores
 *    y rechazados aún no son información entregada al SII.
 *  - Los anulados se informan con <Anulado>A</Anulado> y se cuentan en
 *    TotAnulado; sus montos SÍ suman en los totales para que el resumen
 *    cuadre con la suma de los <Detalle> (el SII cruza ambos).
 *  - TasaImp es siempre 19.0 (IVA chileno), incluso en exentos — igual
 *    que los ejemplos oficiales del SII.
 *
 * Fechas: FchDoc y FchResol usan chileDate (America/Santiago) y
 * TmstFirma el stamp UTC, igual que la emisión de DTE en ./emit.
 */
import { chileDate } from "./emit";
import { esc } from "./xml";

export type LibroSentido = "VENTA" | "COMPRA";

export type LibroDocumento = {
  tipoDte: number;
  /** Folio del documento; null → se excluye del libro. */
  folio: number | null;
  /** Fecha de emisión (Date en hora local, como la guarda la BD). */
  fechaEmision: Date;
  /** RUT de la contraparte: receptor en ventas, proveedor en compras. */
  contraparteRut: string | null;
  contraparteRazonSocial: string | null;
  /** Totales en CLP enteros (el IVA va con signo del documento). */
  neto: number;
  mntExe: number;
  iva: number;
  total: number;
  estado: string;
};

export type BuildLibroInput = {
  sentido: LibroSentido;
  /** Periodo tributario "AAAA-MM". */
  periodo: string;
  /** RUT del emisor del libro, ya normalizado (12345678-9). */
  rutEmisor: string;
  /** Fecha de la resolución que autoriza el envío ("AAAA-MM-DD"). */
  fechaResolucion: string;
  /** Número de resolución (máx. 6 dígitos según el XSD). */
  numeroResolucion: number;
  documentos: LibroDocumento[];
  /** Fecha/hora de firma ("AAAA-MM-DDTHH:MM:SS"); por defecto ahora. */
  tmstFirma?: string;
};

/** Totales de control por tipo de documento (ResumenPeriodo). */
export type TotalesPorTipo = {
  tipoDte: number;
  totDoc: number;
  totAnulado: number;
  totOpExe: number;
  totMntExe: number;
  totMntNeto: number;
  totOpIvaRec: number;
  totMntIva: number;
  totMntTotal: number;
};

/** Estados con información definitiva para el libro. */
const ESTADOS_LIBRO = new Set(["ACEPTADO", "ANULADO"]);

const PERIODO_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
/** RUTType del XSD: [0-9]+-([0-9]|K). */
const RUT_RE = /^\d+-[\dK]$/;

/** Elemento `<nombre>valor</nombre>` con indentación (valor escapado). */
function tag(name: string, valor: string | number, indent = "      "): string {
  return `${indent}<${name}>${esc(String(valor))}</${name}>`;
}

/** Filtra (estados definitivos + con folio) y ordena por fecha y folio. */
export function documentosLibro(docs: LibroDocumento[]): LibroDocumento[] {
  return docs
    .filter(
      (d) => ESTADOS_LIBRO.has(d.estado) && d.folio != null && d.folio > 0,
    )
    .sort(
      (a, b) =>
        a.fechaEmision.getTime() - b.fechaEmision.getTime() ||
        (a.folio ?? 0) - (b.folio ?? 0) ||
        a.tipoDte - b.tipoDte,
    );
}

/** Totales de control agrupados por tipo de documento, ordenados por TpoDoc. */
export function agruparPorTipo(docs: LibroDocumento[]): TotalesPorTipo[] {
  const grupos = new Map<number, TotalesPorTipo>();
  for (const d of documentosLibro(docs)) {
    let g = grupos.get(d.tipoDte);
    if (!g) {
      g = {
        tipoDte: d.tipoDte,
        totDoc: 0,
        totAnulado: 0,
        totOpExe: 0,
        totMntExe: 0,
        totMntNeto: 0,
        totOpIvaRec: 0,
        totMntIva: 0,
        totMntTotal: 0,
      };
      grupos.set(d.tipoDte, g);
    }
    g.totDoc += 1;
    if (d.estado === "ANULADO") g.totAnulado += 1;
    if (Math.abs(d.mntExe) > 0) g.totOpExe += 1;
    if (Math.abs(d.iva) > 0) g.totOpIvaRec += 1;
    g.totMntExe += d.mntExe;
    g.totMntNeto += d.neto;
    g.totMntIva += d.iva;
    g.totMntTotal += d.total;
  }
  return [...grupos.values()].sort((a, b) => a.tipoDte - b.tipoDte);
}

/**
 * Construye el XML del libro. Lanza Error con mensaje claro si la
 * carátula no es válida (periodo, resolución o RUT) para que la ruta
 * API lo devuelva tal cual como 400.
 */
export function buildLibroXml(input: BuildLibroInput): string {
  const { sentido, periodo } = input;
  if (sentido !== "VENTA" && sentido !== "COMPRA") {
    throw new Error(`Tipo de operación inválido: "${sentido}".`);
  }
  if (!PERIODO_RE.test(periodo)) {
    throw new Error(`Periodo inválido: "${periodo}" (se espera AAAA-MM).`);
  }
  if (!FECHA_RE.test(input.fechaResolucion)) {
    throw new Error(
      `Fecha de resolución inválida: "${input.fechaResolucion}" (se espera AAAA-MM-DD).`,
    );
  }
  if (
    !Number.isInteger(input.numeroResolucion) ||
    input.numeroResolucion < 0 ||
    input.numeroResolucion > 999_999
  ) {
    throw new Error("El número de resolución del SII debe tener hasta 6 dígitos.");
  }
  if (!RUT_RE.test(input.rutEmisor)) {
    throw new Error(`RUT del emisor inválido: "${input.rutEmisor}".`);
  }

  const docs = documentosLibro(input.documentos);
  const totales = agruparPorTipo(input.documentos);
  // TmstFirma: stamp UTC sin offset, igual que nowStamp() en ./emit.
  const firma = input.tmstFirma ?? new Date().toISOString().slice(0, 19);

  const l: string[] = [];
  l.push(`<?xml version="1.0" encoding="ISO-8859-1"?>`);
  l.push(
    `<LibroCompraVenta xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sii.cl/SiiDte LibroCVS_v10.xsd" version="1.0">`,
  );
  l.push(`  <EnvioLibro ID="LibroCV-${sentido}-${periodo}">`);
  l.push(`    <Caratula>`);
  l.push(tag("RutEmisorLibro", input.rutEmisor, "      "));
  l.push(tag("RutEnvia", input.rutEmisor, "      "));
  l.push(tag("PeriodoTributario", periodo, "      "));
  l.push(tag("FchResol", input.fechaResolucion, "      "));
  l.push(tag("NroResol", input.numeroResolucion, "      "));
  l.push(tag("TipoOperacion", sentido, "      "));
  l.push(tag("TipoLibro", "MENSUAL", "      "));
  l.push(tag("TipoEnvio", "TOTAL", "      "));
  l.push(`    </Caratula>`);

  if (totales.length > 0) {
    l.push(`    <ResumenPeriodo>`);
    for (const g of totales) {
      l.push(`      <TotalesPeriodo>`);
      l.push(tag("TpoDoc", g.tipoDte, "        "));
      // Tipo de impuesto resumido: solo el libro de compras lo exige/usa.
      if (sentido === "COMPRA") l.push(tag("TpoImp", 1, "        "));
      l.push(tag("TotDoc", g.totDoc, "        "));
      if (g.totAnulado > 0) l.push(tag("TotAnulado", g.totAnulado, "        "));
      if (g.totOpExe > 0) l.push(tag("TotOpExe", g.totOpExe, "        "));
      l.push(tag("TotMntExe", g.totMntExe, "        "));
      l.push(tag("TotMntNeto", g.totMntNeto, "        "));
      if (g.totOpIvaRec > 0) l.push(tag("TotOpIVARec", g.totOpIvaRec, "        "));
      l.push(tag("TotMntIVA", g.totMntIva, "        "));
      l.push(tag("TotMntTotal", g.totMntTotal, "        "));
      l.push(`      </TotalesPeriodo>`);
    }
    l.push(`    </ResumenPeriodo>`);
  }

  for (const d of docs) {
    l.push(`    <Detalle>`);
    l.push(tag("TpoDoc", d.tipoDte, "      "));
    l.push(tag("NroDoc", d.folio as number, "      "));
    if (d.estado === "ANULADO") l.push(`      <Anulado>A</Anulado>`);
    l.push(`      <TasaImp>19.0</TasaImp>`);
    l.push(tag("FchDoc", chileDate(d.fechaEmision), "      "));
    if (d.contraparteRut) {
      if (!RUT_RE.test(d.contraparteRut)) {
        throw new Error(
          `RUT de contraparte inválido en folio ${d.folio}: "${d.contraparteRut}".`,
        );
      }
      l.push(tag("RUTDoc", d.contraparteRut, "      "));
    }
    if (d.contraparteRazonSocial) {
      // RznSoc: máx. 50 caracteres según el XSD.
      l.push(tag("RznSoc", d.contraparteRazonSocial.slice(0, 50), "      "));
    }
    if (d.mntExe !== 0) l.push(tag("MntExe", d.mntExe, "      "));
    l.push(tag("MntNeto", d.neto, "      "));
    l.push(tag("MntIVA", d.iva, "      "));
    l.push(tag("MntTotal", d.total, "      "));
    l.push(`    </Detalle>`);
  }

  l.push(`    <TmstFirma>${firma}</TmstFirma>`);
  l.push(`  </EnvioLibro>`);
  l.push(`</LibroCompraVenta>`);
  return l.join("\n");
}

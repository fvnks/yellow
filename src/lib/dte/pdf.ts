/**
 * Representación impresa de un DTE en PDF, generada desde su XML.
 *
 * El SII no publica un servicio de PDF: la vía habitual (y la de todos
 * los proveedores) es convertir el XML del documento a un PDF legible.
 * Este módulo escribe el PDF a mano (sin dependencias): PDF 1.4 con las
 * fuentes estándar Helvetica y codificación WinAnsi, que coincide con
 * ISO-8859-1 en el rango 0xA0–0xFF — exactamente el universo de
 * caracteres que el SII permite en un DTE.
 *
 * El PDF es siempre una representación derivada: el documento
 * tributario electrónico sigue siendo el XML firmado.
 */

import { unescapeXmlText } from "@/lib/xmlutil";

export class PdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfError";
  }
}

export const ETIQUETA_TIPO: Record<number, string> = {
  33: "Factura Electrónica",
  34: "Factura Exenta Electrónica",
  39: "Boleta Electrónica",
  41: "Boleta Exenta Electrónica",
  46: "Factura de Compra Electrónica",
  52: "Guía de Despacho Electrónica",
  56: "Nota de Débito Electrónica",
  61: "Nota de Crédito Electrónica",
  110: "Factura de Exportación Electrónica",
  112: "Nota de Crédito de Exportación Electrónica",
};

const nf = new Intl.NumberFormat("es-CL");

/**
 * Extracción por nombre de tag exacto (`<IVA>`, nunca `<TasaIVA>`): el
 * XML del DTE usa nombres por defecto sin prefijos, así que anclar en
 * `<` + el nombre completo evita las colisiones de prefijo que tolera
 * `findTag` (que sí acepta `<ns:…>` para el SOAP del SII).
 */
function tag(xml: string, name: string): string | null {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? unescapeXmlText(m[1].trim()) : null;
}

function tagNum(xml: string, name: string): number {
  const raw = tag(xml, name);
  if (raw == null || raw === "") return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new PdfError(`Campo ${name} no numérico: "${raw}"`);
  return n;
}

function bloques(xml: string, name: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

export interface DatosItem {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  monto: number;
}

export interface DatosDte {
  tipoDte: number;
  folio: number;
  fecha: string;
  emisor: { rut: string; razonSocial: string; giro: string; direccion: string; comuna: string };
  receptor: { rut: string; razonSocial: string; giro: string; direccion: string; comuna: string };
  totales: { neto: number; mntExe: number; iva: number; total: number };
  items: DatosItem[];
  referencias: string[];
  tmstFirma: string;
}

/** Lee los campos que necesita la representación impresa. Lanza PdfError. */
export function extraerDatosDte(xml: string): DatosDte {
  const tipoRaw = tag(xml, "TipoDTE");
  const folioRaw = tag(xml, "Folio");
  const rutEmisor = tag(xml, "RUTEmisor");
  const rznSoc = tag(xml, "RznSoc");
  if (!tipoRaw || !folioRaw || !rutEmisor || !rznSoc) {
    throw new PdfError(
      "XML incompleto: se requieren TipoDTE, Folio, RUTEmisor y RznSoc",
    );
  }
  const tipoDte = Number(tipoRaw);
  const folio = Number(folioRaw);
  if (!Number.isInteger(tipoDte) || !Number.isInteger(folio)) {
    throw new PdfError(`Identificación inválida: TipoDTE="${tipoRaw}" Folio="${folioRaw}"`);
  }

  const items = bloques(xml, "Detalle").map((b) => ({
    nombre: tag(b, "NmbItem") ?? "(sin descripción)",
    cantidad: Number(tag(b, "QtyItem") ?? "1"),
    precioUnitario: Number(tag(b, "PrcItem") ?? "0"),
    monto: Number(tag(b, "MontoItem") ?? "0"),
  }));
  if (items.length === 0) {
    throw new PdfError("El XML no tiene líneas de detalle (<Detalle>)");
  }

  const referencias = bloques(xml, "Referencia").map((b) => {
    const tipo = tag(b, "TpoDocRef") ?? "?";
    const f = tag(b, "FolioRef") ?? "?";
    const motivo = tag(b, "RazonRef");
    return `${ETIQUETA_TIPO[Number(tipo)] ?? `Tipo ${tipo}`} N° ${f}${motivo ? ` - ${motivo}` : ""}`;
  });

  return {
    tipoDte,
    folio,
    fecha: tag(xml, "FchEmis") ?? "",
    emisor: {
      rut: rutEmisor,
      razonSocial: rznSoc,
      giro: tag(xml, "GiroEmis") ?? "",
      direccion: tag(xml, "DirOrigen") ?? "",
      comuna: tag(xml, "CmnaOrigen") ?? "",
    },
    receptor: {
      rut: tag(xml, "RUTRecep") ?? "",
      razonSocial: tag(xml, "RznSocRecep") ?? "",
      giro: tag(xml, "GiroRecep") ?? "",
      direccion: tag(xml, "DirRecep") ?? "",
      comuna: tag(xml, "CmnaRecep") ?? "",
    },
    totales: {
      neto: tagNum(xml, "MntNeto"),
      mntExe: tagNum(xml, "MntExe"),
      iva: tagNum(xml, "IVA"),
      total: tagNum(xml, "MntTotal"),
    },
    items,
    referencias,
    tmstFirma: tag(xml, "TmstFirma") ?? "",
  };
}

// ── Composición de líneas y paginación ─────────────────────────────

/** Una fila de texto: puede llevar varias columnas en el mismo renglón. */
interface Row {
  size: number;
  bold?: boolean;
  gris?: boolean;
  /** Espacio extra después de la línea. */
  gap?: number;
  partes: Array<{ x: number; texto: string }>;
}

const MARGIN = 56;
const PAGE_W = 612;
const PAGE_H = 792;
const TOP = PAGE_H - 56;
const BOTTOM = 64;
/** Columnas de la tabla de detalle. */
const COL = { cant: MARGIN, punit: 104, nombre: 166, monto: 452 };

function clp(n: number): string {
  return `$${nf.format(n)}`;
}

/** Fecha "YYYY-MM-DD" → "DD-MM-YYYY"; otro formato pasa tal cual. */
function fechaCorta(fecha: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : fecha;
}

function linea(size: number, texto: string, extra?: Partial<Row>): Row {
  return { size, partes: [{ x: MARGIN, texto }], ...extra };
}

function construirRows(d: DatosDte): Row[] {
  const rows: Row[] = [];
  const etiqueta = ETIQUETA_TIPO[d.tipoDte] ?? `Tipo ${d.tipoDte}`;

  rows.push(linea(15, `${etiqueta} N° ${d.folio}`, { bold: true, gap: 6 }));
  rows.push(linea(11, d.emisor.razonSocial, { bold: true }));
  rows.push(linea(10, `RUT ${d.emisor.rut}`));
  if (d.emisor.giro) rows.push(linea(10, d.emisor.giro));
  const origen = [d.emisor.direccion, d.emisor.comuna].filter(Boolean).join(", ");
  if (origen) rows.push(linea(10, origen, { gap: 8 }));

  if (d.fecha) rows.push(linea(10, `Fecha de emisión: ${fechaCorta(d.fecha)}`));
  rows.push(linea(10, "Receptor", { bold: true }));
  if (d.receptor.razonSocial) rows.push(linea(10, d.receptor.razonSocial));
  if (d.receptor.rut) rows.push(linea(10, `RUT ${d.receptor.rut}`));
  const destino = [d.receptor.direccion, d.receptor.comuna].filter(Boolean).join(", ");
  if (destino) rows.push(linea(10, destino));
  rows.push({ size: 6, partes: [{ x: MARGIN, texto: " " }], gap: 8 });

  // Tabla de detalle: Cant | P. unit | Descripción | Monto.
  rows.push({
    size: 8,
    bold: true,
    gris: true,
    gap: 3,
    partes: [
      { x: COL.cant, texto: "CANT" },
      { x: COL.punit, texto: "P. UNIT" },
      { x: COL.nombre, texto: "DESCRIPCIÓN" },
      { x: COL.monto, texto: "MONTO" },
    ],
  });
  for (const item of d.items) {
    const cant = String(Number(item.cantidad.toFixed(3)));
    const nombre =
      item.nombre.length > 44 ? `${item.nombre.slice(0, 43)}..` : item.nombre;
    rows.push({
      size: 9,
      partes: [
        { x: COL.cant, texto: cant },
        { x: COL.punit, texto: nf.format(item.precioUnitario) },
        { x: COL.nombre, texto: nombre },
        { x: COL.monto, texto: clp(item.monto) },
      ],
    });
  }
  rows.push({ size: 6, partes: [{ x: MARGIN, texto: " " }], gap: 8 });

  // Totales: etiquetas x=360, montos x=470.
  const tot: Array<{ label: string; monto: number; total?: boolean }> = [
    { label: "Neto", monto: d.totales.neto },
    ...(d.totales.mntExe > 0 ? [{ label: "Exento", monto: d.totales.mntExe }] : []),
    ...(d.totales.iva > 0 ? [{ label: "IVA 19%", monto: d.totales.iva }] : []),
    { label: "Total", monto: d.totales.total, total: true },
  ];
  for (const t of tot) {
    const size = t.total ? 12 : 10;
    rows.push({
      size,
      bold: t.total,
      gap: t.total ? 10 : 0,
      partes: [
        { x: 360, texto: t.label },
        { x: 470, texto: clp(t.monto) },
      ],
    });
  }

  for (const ref of d.referencias) {
    rows.push(linea(9, `Referencia: ${ref}`));
  }
  if (d.referencias.length > 0) rows.push({ size: 6, partes: [{ x: MARGIN, texto: " " }], gap: 6 });

  rows.push(
    linea(
      8,
      `Timbre (TED) F${d.folio}T${d.tipoDte}${d.tmstFirma ? ` - firma ${d.tmstFirma}` : ""}.`,
      { gris: true },
    ),
  );
  rows.push(
    linea(
      8,
      "Representación impresa generada por Yellow a partir del XML firmado: " +
        "el documento tributario electrónico es el archivo XML.",
      { gris: true },
    ),
  );
  return rows;
}

interface RowPagina {
  row: Row;
  y: number;
}

/** Pagina las filas respetando los márgenes vertical. */
function paginar(rows: Row[]): RowPagina[][] {
  const pages: RowPagina[][] = [];
  let actual: RowPagina[] = [];
  let y = TOP;
  for (const row of rows) {
    const leading = row.size * 1.3 + (row.gap ?? 0);
    if (y - leading < BOTTOM && actual.length > 0) {
      pages.push(actual);
      actual = [];
      y = TOP;
    }
    y -= leading;
    actual.push({ row, y });
  }
  if (actual.length > 0) pages.push(actual);
  return pages;
}

// ── Escritura del PDF ──────────────────────────────────────────────

/** String literal de PDF: WinAnsi (ISO-8859-1 en la práctica) + escape. */
function pdfStr(texto: string): string {
  let out = "";
  for (let i = 0; i < texto.length; i++) {
    let code = texto.charCodeAt(i);
    if (code > 0xff) code = 0x3f; // fuera de WinAnsi → "?"
    const ch = String.fromCharCode(code);
    if (ch === "(" || ch === ")" || ch === "\\") out += `\\${ch}`;
    else out += ch;
  }
  return `(${out})`;
}

function contenidoPagina(filas: RowPagina[]): string {
  let out = "";
  for (const { row, y } of filas) {
    const yy = Math.round(y);
    out += `${row.gris ? "0.45 g" : "0 g"}\n`;
    // Cada columna lleva su propia matriz Tm (origen absoluto en x,y).
    for (const p of row.partes) {
      out +=
        `BT /F${row.bold ? 2 : 1} ${row.size} Tf ` +
        `1 0 0 1 ${p.x} ${yy} Tm ${pdfStr(p.texto)} Tj ET\n`;
    }
    out += "0 g\n";
  }
  return out;
}

function escribirPdf(paginas: string[]): Buffer {
  const nPag = paginas.length;
  const objF1 = 3 + nPag * 2;
  const objF2 = objF1 + 1;

  const cuerpos: string[] = [];
  // 1: Catálogo.
  cuerpos.push("<< /Type /Catalog /Pages 2 0 R >>");
  // 2: Pages (Resources heredable por las páginas).
  const kids = Array.from({ length: nPag }, (_, i) => `${3 + i * 2} 0 R`).join(" ");
  cuerpos.push(
    `<< /Type /Pages /Kids [${kids}] /Count ${nPag} ` +
      `/Resources << /Font << /F1 ${objF1} 0 R /F2 ${objF2} 0 R >> >> >>`,
  );
  // 3..: pares (página, contenido) y luego las dos fuentes.
  for (let i = 0; i < nPag; i++) {
    cuerpos.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Contents ${4 + i * 2} 0 R >>`,
    );
    const stream = paginas[i];
    cuerpos.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  }
  cuerpos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  cuerpos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  const partes: Buffer[] = [];
  let offset = 0;
  const push = (s: string) => {
    const b = Buffer.from(s, "latin1");
    partes.push(b);
    offset += b.length;
  };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const offsets: number[] = [];
  cuerpos.forEach((cuerpo, i) => {
    offsets.push(offset);
    push(`${i + 1} 0 obj\n${cuerpo}\nendobj\n`);
  });
  const xref = offset;
  const size = cuerpos.length + 1;
  push(`xref\n0 ${size}\n0000000000 65535 f \n`);
  for (const off of offsets) push(`${String(off).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  return Buffer.concat(partes);
}

/** PDF completo de la representación impresa de un DTE. Lanza PdfError. */
export function pdfDesdeXml(xml: string): Buffer {
  const datos = extraerDatosDte(xml);
  const filas = paginar(construirRows(datos));
  return escribirPdf(filas.map(contenidoPagina));
}

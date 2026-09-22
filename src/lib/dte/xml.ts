/**
 * DTE XML builder (SII format, ISO-8859-1).
 *
 * Covers the first-phase document types: 33/34 facturas, 52 guía de
 * despacho, 46 factura de compra, 56 nota de débito, 61 nota de crédito.
 * Element order follows the SII XSD (EnvioDTE_v10 / DTE_v10); final
 * offline validation against the official schemas happens once the
 * emisor is certified — see DEPLOY notes.
 */

/** Escape the 5 predefined XML entities. */
export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface DteItemXml {
  linea: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  afectoIva?: boolean;
  /** Bruto: round(cantidad × precioUnitario) — discounts go in <DscRng>. */
  monto: number;
}

export interface DteReferenceXml {
  tipoDteRef: number;
  folioRef: number;
  /** "YYYY-MM-DD". */
  fechaRef?: string;
  /** 1 = anula, 2 = corrige texto, 3 = corrige montos. */
  codigoRef?: number;
  motivo?: string;
}

export interface BuildDteInput {
  tipoDte: number;
  folio: number;
  /** "YYYY-MM-DD". */
  fechaEmision: string;
  emisor: {
    rut: string; // hyphenated
    razonSocial: string;
    giro: string;
    actividadEconomica: string;
    direccion: string;
    comuna: string;
  };
  receptor: {
    rut: string; // hyphenated
    razonSocial: string;
    giro?: string;
    direccion?: string;
    comuna?: string;
    email?: string;
  };
  totales: { neto: number; mntExe: number; iva: number; total: number };
  items: DteItemXml[];
  references?: DteReferenceXml[];
  /** Guía de despacho (52): transfer indicator. */
  tipoTraslado?: number;
  /** TED element from buildTed(). */
  ted: string;
  /** "YYYY-MM-DDTHH:MM:SS". */
  tmstFirma: string;
  /** Filled by the signer; empty placeholder until a certificate is loaded. */
  firma?: string;
}

function fmtCantidad(cantidad: number): string {
  // Trim trailing zeros: 2.500 → "2.5", 3.000 → "3".
  return String(Number(cantidad.toFixed(3)));
}

function buildIdDoc(input: BuildDteInput): string {
  const lines = [
    `<TipoDTE>${input.tipoDte}</TipoDTE>`,
    `<Folio>${input.folio}</Folio>`,
    `<FchEmis>${input.fechaEmision}</FchEmis>`,
  ];
  if (input.tipoDte === 52 && input.tipoTraslado != null) {
    lines.push(`<IndTraslado>${input.tipoTraslado}</IndTraslado>`);
  }
  return `<IdDoc>\n${lines.join("\n")}\n</IdDoc>`;
}

function buildEmisor(emisor: BuildDteInput["emisor"]): string {
  return (
    `<Emisor>\n` +
    `<RUTEmisor>${emisor.rut}</RUTEmisor>\n` +
    `<RznSoc>${esc(emisor.razonSocial)}</RznSoc>\n` +
    `<GiroEmis>${esc(emisor.giro)}</GiroEmis>\n` +
    `<Acteco>${esc(emisor.actividadEconomica)}</Acteco>\n` +
    `<DirOrigen>${esc(emisor.direccion)}</DirOrigen>\n` +
    `<CmnaOrigen>${esc(emisor.comuna)}</CmnaOrigen>\n` +
    `</Emisor>`
  );
}

function buildReceptor(receptor: BuildDteInput["receptor"]): string {
  const lines = [
    `<RUTRecep>${receptor.rut}</RUTRecep>`,
    `<RznSocRecep>${esc(receptor.razonSocial)}</RznSocRecep>`,
  ];
  if (receptor.giro) lines.push(`<GiroRecep>${esc(receptor.giro)}</GiroRecep>`);
  if (receptor.direccion) lines.push(`<DirRecep>${esc(receptor.direccion)}</DirRecep>`);
  if (receptor.comuna) lines.push(`<CmnaRecep>${esc(receptor.comuna)}</CmnaRecep>`);
  if (receptor.email) lines.push(`<EmailRecep>${esc(receptor.email)}</EmailRecep>`);
  return `<Receptor>\n${lines.join("\n")}\n</Receptor>`;
}

function buildTotales(totales: BuildDteInput["totales"]): string {
  const lines: string[] = [];
  if (totales.neto > 0) lines.push(`<MntNeto>${totales.neto}</MntNeto>`);
  if (totales.mntExe > 0) lines.push(`<MntExe>${totales.mntExe}</MntExe>`);
  if (totales.iva > 0) {
    lines.push(`<TasaIVA>19</TasaIVA>`);
    lines.push(`<IVA>${totales.iva}</IVA>`);
  }
  lines.push(`<MntTotal>${totales.total}</MntTotal>`);
  return `<Totales>\n${lines.join("\n")}\n</Totales>`;
}

function buildDetalle(item: DteItemXml): string {
  const lines = [`<NroLinDet>${item.linea}</NroLinDet>`];
  if (item.afectoIva === false) lines.push(`<IndExe>1</IndExe>`);
  lines.push(`<DscItem>${esc(item.nombre)}</DscItem>`);
  lines.push(`<CantItem>${fmtCantidad(item.cantidad)}</CantItem>`);
  lines.push(`<PrcItem>${item.precioUnitario}</PrcItem>`);
  lines.push(`<MontoItem>${item.monto}</MontoItem>`);
  const descuento = item.descuento ?? 0;
  if (descuento > 0) {
    lines.push(
      `<DscRng><NroLinDR>1</NroLinDR><GlosaDR>Descuento</GlosaDR>` +
        `<TpoMov>D</TpoMov><ValorDR>${descuento}</ValorDR></DscRng>`,
    );
  }
  return `<Detalle>\n${lines.join("\n")}\n</Detalle>`;
}

function buildReferencia(ref: DteReferenceXml, index: number): string {
  const lines = [`<NroLinRef>${index}</NroLinRef>`, `<TpoDocRef>${ref.tipoDteRef}</TpoDocRef>`, `<FolioRef>${ref.folioRef}</FolioRef>`];
  if (ref.fechaRef) lines.push(`<FchRef>${ref.fechaRef}</FchRef>`);
  if (ref.codigoRef != null) lines.push(`<CodRef>${ref.codigoRef}</CodRef>`);
  if (ref.motivo) lines.push(`<RazonRef>${esc(ref.motivo)}</RazonRef>`);
  return `<Referencia>\n${lines.join("\n")}\n</Referencia>`;
}

export const FIRMA_PLACEHOLDER =
  `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
  `<SignatureValue></SignatureValue></Signature>`;

export function buildDteXml(input: BuildDteInput): string {
  const parts = [
    `<?xml version="1.0" encoding="ISO-8859-1"?>`,
    `<DTE version="1.0">`,
    `<Documento ID="F${input.folio}T${input.tipoDte}">`,
    `<Encabezado>`,
    buildIdDoc(input),
    buildEmisor(input.emisor),
    buildReceptor(input.receptor),
    buildTotales(input.totales),
    `</Encabezado>`,
    ...input.items.map(buildDetalle),
    ...(input.references ?? []).map((ref, i) => buildReferencia(ref, i + 1)),
    input.ted,
    `<TmstFirma>${input.tmstFirma}</TmstFirma>`,
    input.firma ?? FIRMA_PLACEHOLDER,
    `</Documento>`,
    `</DTE>`,
  ];
  return parts.join("\n");
}

export interface EnvioInput {
  /** Hyphenated emisor RUT. */
  rutEmisor: string;
  /** Who sends (usually the same company or its provider). */
  rutEnvia: string;
  /** SII resolution that authorized electronic emission. */
  fechaResolucion: string; // YYYY-MM-DD
  numeroResolucion: number;
  /** "YYYY-MM-DDTHH:MM:SS". */
  fchFirma: string;
  /** Fully built DTE XMLs to include in this envío. */
  documentos: string[];
}

/** Build the `<EnvioDTE>` envelope with its Caratula (SII ANEXO 3). */
export function buildEnvioDte(input: EnvioInput): string {
  const counts = new Map<number, number>();
  for (const xml of input.documentos) {
    const tipo = Number(xml.match(/<TipoDTE>(\d+)<\/TipoDTE>/)?.[1] ?? 0);
    counts.set(tipo, (counts.get(tipo) ?? 0) + 1);
  }
  const subTotals = [...counts.entries()]
    .map(([tipo, n]) => `<SubTotDTE><TpoDTE>${tipo}</TpoDTE><NroDTE>${n}</NroDTE></SubTotDTE>`)
    .join("\n");

  return [
    `<?xml version="1.0" encoding="ISO-8859-1"?>`,
    `<EnvioDTE version="1.0" xmlns="http://www.sii.cl/SiiDte">`,
    `<SetDTE ID="SetDoc">`,
    `<Caratula version="1.0">`,
    `<RutEmisor>${input.rutEmisor}</RutEmisor>`,
    `<RutEnvia>${input.rutEnvia}</RutEnvia>`,
    `<RutReceptor>66666666-6</RutReceptor>`,
    `<FchResol>${input.fechaResolucion}</FchResol>`,
    `<NroResol>${input.numeroResolucion}</NroResol>`,
    `<FchFirma>${input.fchFirma}</FchFirma>`,
    `<TmstFirmaEnv>${input.fchFirma}</TmstFirmaEnv>`,
    subTotals,
    `</Caratula>`,
    ...input.documentos,
    `</SetDTE>`,
    `</EnvioDTE>`,
  ].join("\n");
}

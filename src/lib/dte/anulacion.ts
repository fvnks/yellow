/**
 * Reglas de anulación de DTE — FAQ oficial del SII 001.003.2167.006
 * (actualizada 28/05/2025):
 *
 *  - Previo al envío/aceptación → informar la nulidad del folio al SII
 *    (portal con certificado → `SiiClient.anularFolio`, mock → real).
 *  - Aceptado 33/34/46 → Nota de Crédito (61) con campo de anulación
 *    (CodRef=1) en el período corriente o el siguiente; anular una NC
 *    exige ND (56) y viceversa. Queda registrado en los libros.
 *  - Aceptado 52 → sin informe al SII: sólo Libro de Guías.
 *  - Aceptado sin NC posible → carta de anulación para el SII.
 *
 * Lógica pura (sin BD); la orquestación vive en la ruta /anular.
 */

export type MetodoAnulacion = "nc" | "directa";

/** Nota compensatoria que corresponde según el tipo (null = sin nota). */
export function tipoNotaCompensatoria(tipoDte: number): 61 | 56 | null {
  if (tipoDte === 61) return 56;
  if (tipoDte === 56 || tipoDte === 33 || tipoDte === 34 || tipoDte === 46) return 61;
  return null;
}

/**
 * Métodos que el diálogo ofrece para un documento: folio sólo cuando está
 * firmado sin enviar; NC + carta cuando está aceptado y toca nota; guía
 * sólo por anulación directa; nada en estados sin folio o terminales.
 */
export function metodosAnulacion(estado: string, tipoDte: number): MetodoAnulacion[] {
  if (estado === "FIRMADO") return ["directa"];
  if (estado === "ACEPTADO") {
    return tipoNotaCompensatoria(tipoDte) ? ["nc", "directa"] : ["directa"];
  }
  return [];
}

/** Frase persistida en DteDocument.motivoAnulacion. */
export function motivoAnulado(detalle: string, motivo: string): string {
  return `${detalle} — ${motivo}`;
}

export interface CartaAnulacionInput {
  emisor: { rut: string; razonSocial: string; giro?: string | null };
  receptorRazonSocial?: string | null;
  tipoDte: number;
  folio: number;
  /** America/Santiago, AAAA-MM-DD. */
  fechaEmision: string;
  total: number;
  motivo: string;
}

const TIPO_LABEL: Record<number, string> = {
  33: "Factura",
  34: "Factura exenta",
  46: "Factura de compra",
  52: "Guía de despacho",
  56: "Nota de débito",
  61: "Nota de crédito",
};

/** Carta en texto plano para presentar ante el SII (anulación total). */
export function cartaAnulacion(input: CartaAnulacionInput): string {
  const hoy = new Intl.DateTimeFormat("es-CL", {
    dateStyle: "long",
    timeZone: "America/Santiago",
  }).format(new Date());
  const label = TIPO_LABEL[input.tipoDte] ?? `Tipo ${input.tipoDte}`;
  return [
    "CARTA DE ANULACIÓN DE DOCUMENTO TRIBUTARIO ELECTRÓNICO",
    "",
    "Al Servicio de Impuestos Internos",
    "",
    `Emisor: ${input.emisor.rut} — ${input.emisor.razonSocial}` +
      `${input.emisor.giro ? ` (${input.emisor.giro})` : ""}`,
    `Documento: ${label} (tipo ${input.tipoDte}) N° ${input.folio}, de fecha ${input.fechaEmision}`,
    `Receptor: ${input.receptorRazonSocial ?? "—"}`,
    `Monto total: $${input.total.toLocaleString("es-CL")} CLP`,
    "",
    "Por medio de la presente solicitamos la anulación del documento",
    "tributario electrónico detallado, por el siguiente motivo:",
    "",
    `  ${input.motivo}`,
    "",
    "Sin otro particular,",
    "",
    hoy,
    "",
    "____________________________",
    input.emisor.razonSocial,
    input.emisor.rut,
  ].join("\n");
}

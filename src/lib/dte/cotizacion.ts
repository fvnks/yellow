/**
 * Ciclo de vida de una cotización. Las transiciones inválidas se responden
 * con 409 (no 500), cerrando la deuda señalada en la auditoría para el
 * análogo de los DTE.
 */
export type CotizacionEstado =
  | "BORRADOR"
  | "ENVIADA"
  | "ACEPTADA"
  | "RECHAZADA"
  | "CONVERTIDA";

/** Desde BORRADOR se puede saltar directo: el cliente puede aceptar en el acto. */
const TRANSICIONES: Record<CotizacionEstado, CotizacionEstado[]> = {
  BORRADOR: ["ENVIADA", "ACEPTADA", "RECHAZADA"],
  ENVIADA: ["ACEPTADA", "RECHAZADA"],
  ACEPTADA: [],
  RECHAZADA: [],
  CONVERTIDA: [],
};

export function transicionValida(
  desde: CotizacionEstado,
  hacia: CotizacionEstado,
): boolean {
  return TRANSICIONES[desde]?.includes(hacia) ?? false;
}

/** Convertir en venta: posible mientras no esté cerrada ni ya convertida. */
export function convertible(desde: CotizacionEstado): boolean {
  return desde === "BORRADOR" || desde === "ENVIADA" || desde === "ACEPTADA";
}

/** Formato de presentación del correlativo: 1 → "COT-0001". */
export function etiquetaCotizacion(numero: number): string {
  return `COT-${String(numero).padStart(4, "0")}`;
}

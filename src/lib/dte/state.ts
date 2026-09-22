/**
 * DTE lifecycle state machine.
 *
 *   BORRADOR → FIRMADO → ENVIADO → ACEPTADO → ANULADO
 *                            └─────→ RECHAZADO
 *
 * A FIRMADO document can resume emission (re-send) — the folio, once
 * assigned, is never reused. Terminal states have no outgoing edges.
 */

export type DteEstado =
  | "BORRADOR"
  | "FIRMADO"
  | "ENVIADO"
  | "ACEPTADO"
  | "RECHAZADO"
  | "ANULADO";

const TRANSITIONS: Record<DteEstado, readonly DteEstado[]> = {
  BORRADOR: ["FIRMADO"],
  FIRMADO: ["ENVIADO"],
  ENVIADO: ["ACEPTADO", "RECHAZADO"],
  ACEPTADO: ["ANULADO"],
  RECHAZADO: [],
  ANULADO: [],
};

export function canTransition(from: DteEstado, to: DteEstado): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: DteEstado,
    readonly to: DteEstado,
  ) {
    super(`Transición inválida de DTE: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: DteEstado, to: DteEstado): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

/** States from which the emission pipeline may be (re)started. */
export function canEmitir(estado: DteEstado): boolean {
  return estado === "BORRADOR" || estado === "FIRMADO";
}

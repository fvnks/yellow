/**
 * DTE money math. All amounts are integer Chilean pesos (CLP);
 * IVA is 19% rounded half-up on the taxable net.
 */

export const IVA_RATE = 0.19;

/** Document types that charge IVA. 34 (exenta) is the notable exception. */
const IVA_EXEMPT_TIPOS = new Set([34, 41]);

export interface TotalsInputItem {
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  afectoIva?: boolean;
}

export interface Totals {
  /** Taxable net (MntNeto). */
  neto: number;
  /** Exempt amount (MntExe). */
  mntExe: number;
  /** IVA charged (MntIVA). 0 for exempt document types. */
  iva: number;
  /** Grand total (MntTotal). */
  total: number;
}

/** Line amount: round(quantity × unit price) − line discount. */
export function lineTotal(item: TotalsInputItem): number {
  const bruto = Math.round(item.cantidad * item.precioUnitario);
  return bruto - (item.descuento ?? 0);
}

/**
 * Compute document totals from its lines.
 * - Exempt lines (afectoIva=false) and every line of an exempt document
 *   type accumulate into mntExe instead of the taxable net.
 * - IVA = round-half-up(neto × 0.19), or 0 when the type is exempt.
 */
export function computeTotals(
  tipoDte: number,
  items: TotalsInputItem[],
): Totals {
  const docIsExempt = IVA_EXEMPT_TIPOS.has(tipoDte);

  let neto = 0;
  let mntExe = 0;
  for (const item of items) {
    const amount = lineTotal(item);
    if (docIsExempt || item.afectoIva === false) {
      mntExe += amount;
    } else {
      neto += amount;
    }
  }

  const iva = docIsExempt || neto === 0 ? 0 : Math.round(neto * IVA_RATE);
  return { neto, mntExe, iva, total: neto + mntExe + iva };
}

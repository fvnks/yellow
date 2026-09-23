/**
 * Chilean RUT utilities (validation, normalization, formatting).
 * Check digit uses the Modulo 11 algorithm mandated by the SII.
 */

/** Strip dots, hyphens and whitespace; uppercase. "12.345.678-5" → "123456785" (digits only — use formatRutDv to re-insert the XML hyphen). */
export function normalizeRut(rut: string): string {
  return rut.replace(/[.\-\s]/g, "").toUpperCase();
}

/** Extract the body (everything before the check digit). */
function rutBody(normalized: string): string {
  return normalized.slice(0, -1);
}

/** Compute the Modulo 11 check digit for a RUT body. */
export function rutCheckDigit(body: string): string {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
}

/** True when the RUT is structurally valid (body digits + correct check digit). */
export function isValidRut(rut: string): boolean {
  const normalized = normalizeRut(rut);
  if (!/^\d{1,8}[0-9K]$/.test(normalized)) return false;
  const body = rutBody(normalized);
  return rutCheckDigit(body) === normalized.slice(-1);
}

/** Normalize and validate in one step; returns null when invalid. */
export function parseRut(rut: string): string | null {
  const normalized = normalizeRut(rut);
  return isValidRut(normalized) ? normalized : null;
}

/** "762379115" → "76237911-5" (hyphenated format used inside DTE XML). */
export function formatRutDv(rut: string): string {
  const normalized = normalizeRut(rut);
  return `${normalized.slice(0, -1)}-${normalized.slice(-1)}`;
}

/** "123456785" → "12.345.678-5" for display. */
export function formatRut(rut: string): string {
  const normalized = normalizeRut(rut);
  const body = rutBody(normalized);
  const dv = normalized.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${dv}`;
}

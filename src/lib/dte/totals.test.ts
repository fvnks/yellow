import { describe, expect, it } from "vitest";
import { computeTotals, lineTotal } from "./totals";

describe("lineTotal", () => {
  it("rounds quantity × price and subtracts the discount", () => {
    expect(lineTotal({ cantidad: 3, precioUnitario: 1000 })).toBe(3000);
    expect(lineTotal({ cantidad: 2.5, precioUnitario: 999 })).toBe(2498); // 2497.5 → 2498
    expect(lineTotal({ cantidad: 1, precioUnitario: 5000, descuento: 500 })).toBe(4500);
  });
});

describe("computeTotals", () => {
  it("computes IVA 19% rounded on the taxable net (tipo 33)", () => {
    const t = computeTotals(33, [{ cantidad: 1, precioUnitario: 100_000 }]);
    expect(t.neto).toBe(100_000);
    expect(t.iva).toBe(19_000);
    expect(t.total).toBe(119_000);
  });

  it("rounds half-up on odd nets", () => {
    // 1_001 × 0.19 = 190.19 → 190
    expect(computeTotals(33, [{ cantidad: 1, precioUnitario: 1_001 }]).iva).toBe(190);
    // 5_005 × 0.19 = 950.95 → 951
    expect(computeTotals(33, [{ cantidad: 1, precioUnitario: 5_005 }]).iva).toBe(951);
    // 50 × 0.19 = 9.5 → 10 (exact .5 rounds up)
    expect(computeTotals(33, [{ cantidad: 1, precioUnitario: 50 }]).iva).toBe(10);
  });

  it("splits exempt lines into MntExe (tipo 33 with an exempt line)", () => {
    const t = computeTotals(33, [
      { cantidad: 1, precioUnitario: 10_000, afectoIva: true },
      { cantidad: 1, precioUnitario: 4_000, afectoIva: false },
    ]);
    expect(t.neto).toBe(10_000);
    expect(t.mntExe).toBe(4_000);
    expect(t.iva).toBe(1_900);
    expect(t.total).toBe(15_900);
  });

  it("charges no IVA on exenta facturas (tipo 34)", () => {
    const t = computeTotals(34, [
      { cantidad: 2, precioUnitario: 5_000, afectoIva: true },
    ]);
    expect(t.neto).toBe(0);
    expect(t.mntExe).toBe(10_000);
    expect(t.iva).toBe(0);
    expect(t.total).toBe(10_000);
  });

  it("sums multi-line documents with discounts", () => {
    const t = computeTotals(33, [
      { cantidad: 10, precioUnitario: 990, descuento: 400 },
      { cantidad: 1, precioUnitario: 50_000 },
    ]);
    expect(t.neto).toBe(9_500 + 50_000);
    expect(t.iva).toBe(Math.round(59_500 * 0.19));
    expect(t.total).toBe(t.neto + t.iva);
  });

  it("returns zero IVA when there is no taxable net", () => {
    const t = computeTotals(33, []);
    expect(t).toEqual({ neto: 0, mntExe: 0, iva: 0, total: 0 });
  });
});

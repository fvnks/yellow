import { describe, expect, it } from "vitest";
import {
  convertible,
  etiquetaCotizacion,
  transicionValida,
} from "./cotizacion";

describe("transiciones de cotización", () => {
  it("borrador puede ir a enviada, aceptada o rechazada", () => {
    expect(transicionValida("BORRADOR", "ENVIADA")).toBe(true);
    expect(transicionValida("BORRADOR", "ACEPTADA")).toBe(true);
    expect(transicionValida("BORRADOR", "RECHAZADA")).toBe(true);
  });

  it("enviada puede aceptarse o rechazarse, pero no volver a borrador", () => {
    expect(transicionValida("ENVIADA", "ACEPTADA")).toBe(true);
    expect(transicionValida("ENVIADA", "RECHAZADA")).toBe(true);
    expect(transicionValida("ENVIADA", "BORRADOR")).toBe(false);
  });

  it("los estados terminales no permiten más transiciones", () => {
    for (const terminal of ["ACEPTADA", "RECHAZADA", "CONVERTIDA"] as const) {
      expect(transicionValida(terminal, "ENVIADA")).toBe(false);
      expect(transicionValida(terminal, "ACEPTADA")).toBe(false);
      expect(transicionValida(terminal, "RECHAZADA")).toBe(false);
    }
  });
});

describe("convertible", () => {
  it("permite convertir desde borrador, enviada o aceptada", () => {
    expect(convertible("BORRADOR")).toBe(true);
    expect(convertible("ENVIADA")).toBe(true);
    expect(convertible("ACEPTADA")).toBe(true);
  });

  it("rechaza convertir desde cerradas o ya convertidas", () => {
    expect(convertible("RECHAZADA")).toBe(false);
    expect(convertible("CONVERTIDA")).toBe(false);
  });
});

describe("etiquetaCotizacion", () => {
  it("rellena el correlativo a 4 dígitos", () => {
    expect(etiquetaCotizacion(1)).toBe("COT-0001");
    expect(etiquetaCotizacion(42)).toBe("COT-0042");
    expect(etiquetaCotizacion(12345)).toBe("COT-12345");
  });
});

import { describe, expect, it } from "vitest";
import { LANDING_DE, OFERTAS, normalizarOferta } from "./oferta";

describe("normalizarOferta", () => {
  it("acepta la oferta de diseño", () => {
    expect(normalizarOferta("diseno")).toBe("diseno");
  });

  it("acepta la oferta erp", () => {
    expect(normalizarOferta("erp")).toBe("erp");
  });

  it("cae en erp cuando el parametro no viene", () => {
    expect(normalizarOferta(undefined)).toBe("erp");
    expect(normalizarOferta("")).toBe("erp");
  });

  it("ignora valores desconocidos en vez de romper", () => {
    expect(normalizarOferta("diseno-web")).toBe("erp");
    expect(normalizarOferta("ERP")).toBe("erp");
  });

  it("toma el primer valor cuando el parametro viene repetido", () => {
    expect(normalizarOferta(["diseno", "erp"])).toBe("diseno");
    expect(normalizarOferta(["", "diseno"])).toBe("erp");
  });
});

describe("OFERTAS", () => {
  it("cada oferta tiene su propia etiqueta y destino", () => {
    const ids = OFERTAS.map((o) => o.id);
    expect(ids).toEqual(["erp", "diseno"]);
    expect(new Set(OFERTAS.map((o) => o.href)).size).toBe(OFERTAS.length);
  });
});

describe("LANDING_DE", () => {
  it("apunta a la landing larga de cada oferta", () => {
    expect(LANDING_DE.diseno).toBe("/diseno");
    expect(LANDING_DE.erp).toBe("/?oferta=erp#funciones");
  });
});

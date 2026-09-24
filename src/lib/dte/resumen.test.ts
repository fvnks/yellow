import { describe, expect, it } from "vitest";
import { resumenPorDimension, type GrupoDimension } from "./resumen";

describe("resumenPorDimension", () => {
  it("sin grupos devuelve lista vacía", () => {
    expect(resumenPorDimension([], new Map(), "Sin área")).toEqual([]);
  });

  it("el grupo null cae bajo la etiqueta 'Sin ...'", () => {
    const grupos: GrupoDimension[] = [{ id: null, docs: 2, total: 900 }];
    const filas = resumenPorDimension(grupos, new Map(), "Sin área");
    expect(filas).toEqual([{ nombre: "Sin área", docs: 2, total: 900 }]);
  });

  it("mapea ids a nombres y ordena por total descendente", () => {
    const grupos: GrupoDimension[] = [
      { id: "a", docs: 1, total: 100 },
      { id: "b", docs: 3, total: 700 },
      { id: null, docs: 2, total: 300 },
    ];
    const nombres = new Map([
      ["a", "ADM"],
      ["b", "VENTAS"],
    ]);
    const filas = resumenPorDimension(grupos, nombres, "Sin área");
    expect(filas.map((f) => f.nombre)).toEqual(["VENTAS", "Sin área", "ADM"]);
    expect(filas[0]).toEqual({ nombre: "VENTAS", docs: 3, total: 700 });
  });

  it("empate de total desempata por nombre (orden estable, locale es)", () => {
    const grupos: GrupoDimension[] = [
      { id: "z", docs: 1, total: 500 },
      { id: "m", docs: 1, total: 500 },
    ];
    const nombres = new Map([
      ["z", "Operaciones"],
      ["m", "Administración"],
    ]);
    const filas = resumenPorDimension(grupos, nombres, "Sin área");
    expect(filas.map((f) => f.nombre)).toEqual(["Administración", "Operaciones"]);
  });

  it("un id desconocido cae en la etiqueta sin asignar (defensa)", () => {
    const grupos: GrupoDimension[] = [{ id: "fantasma", docs: 1, total: 10 }];
    const filas = resumenPorDimension(grupos, new Map(), "Sin categoría");
    expect(filas).toEqual([{ nombre: "Sin categoría", docs: 1, total: 10 }]);
  });
});

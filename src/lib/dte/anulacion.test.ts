import { describe, expect, it } from "vitest";
import {
  cartaAnulacion,
  metodosAnulacion,
  motivoAnulado,
  tipoNotaCompensatoria,
} from "./anulacion";

describe("tipoNotaCompensatoria", () => {
  it("maps SII FAQ 001.003.2167.006: facturas → NC, NC → ND, ND → NC", () => {
    expect(tipoNotaCompensatoria(33)).toBe(61);
    expect(tipoNotaCompensatoria(34)).toBe(61);
    expect(tipoNotaCompensatoria(46)).toBe(61);
    expect(tipoNotaCompensatoria(61)).toBe(56);
    expect(tipoNotaCompensatoria(56)).toBe(61);
  });

  it("needs no compensating note for guías or unknown types", () => {
    expect(tipoNotaCompensatoria(52)).toBeNull();
    expect(tipoNotaCompensatoria(999)).toBeNull();
  });
});

describe("metodosAnulacion", () => {
  it("only offers folio annulment for signed (never-sent) docs", () => {
    expect(metodosAnulacion("FIRMADO", 33)).toEqual(["directa"]);
  });

  it("offers NC + carta for accepted docs that take a note", () => {
    expect(metodosAnulacion("ACEPTADO", 33)).toEqual(["nc", "directa"]);
    expect(metodosAnulacion("ACEPTADO", 61)).toEqual(["nc", "directa"]);
    expect(metodosAnulacion("ACEPTADO", 52)).toEqual(["directa"]);
  });

  it("offers nothing for draft, in-flight or dead documents", () => {
    expect(metodosAnulacion("BORRADOR", 33)).toEqual([]);
    expect(metodosAnulacion("ENVIADO", 33)).toEqual([]);
    expect(metodosAnulacion("RECHAZADO", 33)).toEqual([]);
    expect(metodosAnulacion("ANULADO", 33)).toEqual([]);
  });
});

describe("motivoAnulado", () => {
  it("joins the annulment detail with the user's motivo", () => {
    expect(motivoAnulado("NC N° 1005", "Error en datos")).toBe(
      "NC N° 1005 — Error en datos",
    );
  });
});

describe("cartaAnulacion", () => {
  const carta = cartaAnulacion({
    emisor: { rut: "76.543.210-3", razonSocial: "Yellow SpA", giro: "Software" },
    receptorRazonSocial: "Cliente Ltda",
    tipoDte: 33,
    folio: 1001,
    fechaEmision: "2026-09-22",
    total: 119000,
    motivo: "Cliente canceló el pedido",
  });

  it("addresses the SII with emisor, document, montos and motivo", () => {
    expect(carta).toContain("Al Servicio de Impuestos Internos");
    expect(carta).toContain("76.543.210-3");
    expect(carta).toContain("Factura (tipo 33) N° 1001");
    expect(carta).toContain("de fecha 2026-09-22");
    expect(carta).toContain("119.000");
    expect(carta).toContain("Cliente canceló el pedido");
    expect(carta).toContain("Yellow SpA");
  });
});

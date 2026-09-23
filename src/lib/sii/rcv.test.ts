import { describe, expect, it } from "vitest";
import type { ClientePortalHttp } from "./portal";
import {
  datosRegistro,
  descargarCsv,
  descargarRegistro,
  detalleTipo,
  mapearFila,
  tiposConDatos,
} from "./rcv";

const filaCruda = {
  detTipoDoc: "33",
  detNroDoc: "1004",
  detRutDoc: "76111222",
  detDvDoc: "5",
  detRznSoc: "Cliente SpA",
  detFchDoc: "2026-09-15",
  detMntNeto: "1000000",
  detMntExe: "0",
  detMntIVA: "190000",
  detMntTotal: "1190000",
};

function stub(overrides?: Partial<ClientePortalHttp> & {
  onDetalle?: (body: { data: Record<string, unknown> }) => void;
}): ClientePortalHttp & { llamadas: Array<{ url: string; body: unknown }> } {
  const llamadas: Array<{ url: string; body: unknown }> = [];
  return {
    llamadas,
    ambiente: "certificacion",
    baseRcv: "https://www4c.sii.cl",
    token: "TOKEN-DE-PRUEBA",
    async postJson(url, body) {
      llamadas.push({ url, body });
      if (url.endsWith("/getResumen")) {
        return { data: [{ rsmnTipoDocInteger: 33 }, { rsmnTipoDocInteger: 61 }, { rsmnTipoDocInteger: "" }] };
      }
      if (url.endsWith("/getDetalleVenta") || url.endsWith("/getDetalleCompra")) {
        overrides?.onDetalle?.(body as { data: Record<string, unknown> });
        return { respEstado: { codRespuesta: 0 }, data: [filaCruda] };
      }
      return { data: [] };
    },
    async postTexto(url, body) {
      llamadas.push({ url, body });
      return "tipo;folio;fecha\r\n33;1004;2026-09-15\r\n";
    },
    ...overrides,
  };
}

describe("datosRegistro", () => {
  const base = { rut: "76543210-3", periodo: "2026-09" } as const;

  it("parte el RUT y arma ptributario/operacion", () => {
    expect(datosRegistro({ ...base, sentido: "VENTA" })).toEqual({
      rutEmisor: "76543210",
      dvEmisor: "3",
      ptributario: "202609",
      operacion: "VENTA",
      estadoContab: "REGISTRO",
    });
  });

  it("el detalle lleva el bypass de recaptcha con la acción correcta", () => {
    expect(datosRegistro({ ...base, sentido: "COMPRA", recaptcha: true })).toMatchObject({
      tokenRecaptcha: "t-o-k-e-n-web",
      accionRecaptcha: "RCV_DETC",
    });
    expect(datosRegistro({ ...base, sentido: "VENTA", recaptcha: true })).toMatchObject({
      accionRecaptcha: "RCV_DETV",
    });
  });

  it("rechaza periodos mal formados", () => {
    expect(() => datosRegistro({ rut: "76543210-3", periodo: "2026-13", sentido: "VENTA" })).toThrow(
      /Periodo inválido/,
    );
  });
});

describe("mapearFila", () => {
  it("mapea los campos del SII a FilaRegistro", () => {
    expect(mapearFila(filaCruda)).toEqual({
      tipoDte: 33,
      folio: 1004,
      fecha: "2026-09-15",
      contraparteRut: "76111222-5",
      contraparteRazonSocial: "Cliente SpA",
      neto: 1000000,
      exento: 0,
      iva: 190000,
      total: 1190000,
    });
  });

  it("tolera campos ausentes y RUT sin DV", () => {
    const f = mapearFila({ detRutDoc: "76111222" });
    expect(f.contraparteRut).toBe("76111222");
    expect(f.folio).toBe(0);
    expect(f.total).toBe(0);
  });
});

describe("descargarRegistro", () => {
  const params = { rut: "76543210-3", periodo: "2026-09", sentido: "VENTA" } as const;

  it("descubre tipos con getResumen y concatena sus detalles", async () => {
    const s = stub();
    const filas = await descargarRegistro(s, params);
    // Dos tipos con datos (33 y 61; el vacío se filtra) → dos detalles.
    expect(filas).toHaveLength(2);
    expect(s.llamadas[0].url).toContain("/getResumen");
    const ns = (s.llamadas[1].body as { metaData: { namespace: string; conversationId: string } }).metaData;
    expect(ns.namespace).toContain("FacadeService/getDetalleVenta");
    expect(ns.conversationId).toBe("TOKEN-DE-PRUEBA");
    // Cada detalle lleva su codTipoDoc.
    const codigos = s.llamadas
      .slice(1)
      .map((l) => (l.body as { data: { codTipoDoc: string } }).data.codTipoDoc);
    expect(codigos).toEqual(["33", "61"]);
  });

  it("sin getResumen cuando ya se pide un tipo puntual", async () => {
    const s = stub();
    await detalleTipo(s, { ...params, tipoDte: 33 });
    expect(s.llamadas).toHaveLength(1);
    expect(s.llamadas[0].url).toContain("/getDetalleVenta");
  });

  it("filtra los tipos desde el resumen", async () => {
    const s = stub();
    expect(await tiposConDatos(s, params)).toEqual([33, 61]);
  });
});

describe("descargarCsv", () => {
  it("usa el endpoint Export con recaptcha y devuelve el texto", async () => {
    const s = stub();
    const csv = await descargarCsv(s, {
      rut: "76543210-3",
      periodo: "2026-09",
      sentido: "VENTA",
    });
    expect(csv).toContain("tipo;folio;fecha");
    const body = s.llamadas[0].body as { metaData: { namespace: string }; data: Record<string, unknown> };
    expect(body.metaData.namespace).toContain("getDetalleVentaExport");
    expect(body.data.tokenRecaptcha).toBe("t-o-k-e-n-web");
  });
});

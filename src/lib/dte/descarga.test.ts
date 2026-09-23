import { describe, expect, it } from "vitest";
import type { FilaRegistro } from "@/lib/sii/rcv";
import {
  csvRegistro,
  documentosMock,
  fusionarRcv,
  MOTIVO_XML_EXTERNO,
  MOTIVO_XML_TERCEROS,
  motivoXml,
  resolverModo,
  type DocumentoRegistro,
} from "./descarga";

/** Documento local mínimo (DocLocal es interno, éste calza con su shape). */
function docLocal(over?: Partial<Parameters<typeof documentosMock>[0][number]>) {
  return {
    tipoDte: 33,
    folio: 1004,
    fechaEmision: new Date(2026, 8, 15, 12, 0, 0),
    receptorRut: "12345678-5",
    receptorRazonSocial: "Señores & Cía",
    emisorRut: "76543210-3",
    emisorRazonSocial: "Yellow Test SpA",
    neto: 1000000,
    mntExe: 0,
    iva: 190000,
    total: 1190000,
    estado: "ACEPTADO",
    xml: "<DTE/>",
    ...over,
  };
}

function fila(over?: Partial<FilaRegistro>): FilaRegistro {
  return {
    tipoDte: 33,
    folio: 1004,
    fecha: "2026-09-15",
    contraparteRut: "76111222-5",
    contraparteRazonSocial: "Cliente SpA",
    neto: 1000000,
    exento: 0,
    iva: 190000,
    total: 1190000,
    ...over,
  };
}

describe("resolverModo", () => {
  it("real con credenciales, mock sin ellas", () => {
    expect(resolverModo(true)).toBe("real");
    expect(resolverModo(false)).toBe("mock");
  });
});

describe("csvRegistro: neutraliza fórmulas de hoja de cálculo", () => {
  /** Fila válida de DocumentoRegistro: `fila()` más los campos obligatorios. */
  const doc = (over?: Partial<DocumentoRegistro>): DocumentoRegistro => ({
    ...fila(),
    estado: "ACEPTADO",
    xmlLocal: true,
    ...over,
  });

  it("prefija apóstrofo a celdas que arrancan con =, +, - o @", () => {
    const csv = csvRegistro([
      doc({ contraparteRazonSocial: "=1+1" }),
      doc({ folio: 1005, contraparteRazonSocial: "+56911112222" }),
      doc({ folio: 1006, contraparteRazonSocial: "-cmd" }),
      doc({ folio: 1007, contraparteRazonSocial: "@usuario" }),
    ]);
    const filas = csv.split("\r\n");
    expect(filas[1]).toContain("33;1004;2026-09-15;76111222-5;'=1+1");
    expect(filas[2]).toContain("76111222-5;'+56911112222");
    expect(filas[3]).toContain("76111222-5;'-cmd");
    expect(filas[4]).toContain("76111222-5;'@usuario");
  });

  it("el prefijo convive con el comillado cuando la celda tiene ;", () => {
    const csv = csvRegistro([doc({ contraparteRazonSocial: "=1+1;2" })]);
    expect(csv.split("\r\n")[1]).toContain("\"'=1+1;2\"");
  });

  it("deja intactas las celdas normales", () => {
    const csv = csvRegistro([doc()]);
    expect(csv.split("\r\n")[1]).toContain(";Cliente SpA;");
    expect(csv).not.toContain("'");
  });
});

describe("documentosMock", () => {
  it("incluye sólo ACEPTADO/ANULADO con folio y mapea la contraparte", () => {
    const docs = [
      docLocal(),
      docLocal({ folio: 1005, estado: "ANULADO", xml: null }),
      docLocal({ folio: 1006, estado: "BORRADOR" }), // nunca llegó al SII
      docLocal({ folio: null, estado: "BORRADOR" }),
    ];
    const out = documentosMock(docs, "SALIDA");
    expect(out.map((d) => d.folio)).toEqual([1004, 1005]);
    expect(out[0].contraparteRut).toBe("12345678-5");
    expect(out[0].fecha).toBe("2026-09-15"); // hora de Chile
    expect(out[0].xmlLocal).toBe(true);
    expect(out[0].motivoSinXml).toBeUndefined();
    // ANULADO sin XML → motivo honesto.
    expect(out[1].xmlLocal).toBe(false);
    expect(out[1].motivoSinXml).toBe(MOTIVO_XML_EXTERNO);
  });

  it("en compras la contraparte es el emisor (proveedor)", () => {
    const out = documentosMock([docLocal({ estado: "ACEPTADO", xml: null })], "ENTRADA");
    expect(out[0].contraparteRut).toBe("76543210-3");
    expect(out[0].contraparteRazonSocial).toBe("Yellow Test SpA");
    expect(out[0].motivoSinXml).toBe(MOTIVO_XML_TERCEROS);
  });
});

describe("fusionarRcv", () => {
  it("casa filas del SII con XML local por tipo+folio", () => {
    const out = fusionarRcv(
      [fila(), fila({ tipoDte: 61, folio: 4 })],
      [docLocal()], // 33/1004 con XML
      "SALIDA",
    );
    expect(out).toHaveLength(2);
    expect(out[0].xmlLocal).toBe(true);
    expect(out[0].estado).toBe("ACEPTADO");
    expect(out[0].motivoSinXml).toBeUndefined();
    // La NC 61/4 no existe en Yellow → motivo externo.
    expect(out[1].xmlLocal).toBe(false);
    expect(out[1].motivoSinXml).toBe(MOTIVO_XML_EXTERNO);
  });

  it("también casa documentos aún no aceptados (ENVIADO conserva el XML)", () => {
    const out = fusionarRcv(
      [fila()],
      [docLocal({ estado: "ENVIADO" })],
      "SALIDA",
    );
    expect(out[0].estado).toBe("ENVIADO");
    expect(out[0].xmlLocal).toBe(true);
  });

  it("ignora filas basura (folio/tipo inválido) y usa el motivo de terceros en compras", () => {
    const out = fusionarRcv(
      [fila({ folio: 0 }), fila({ tipoDte: 0 }), fila()],
      [],
      "ENTRADA",
    );
    expect(out).toHaveLength(1);
    expect(out[0].motivoSinXml).toBe(MOTIVO_XML_TERCEROS);
    expect(out[0].estado).toBeNull();
  });

  it("motivoXml distingue sentidos", () => {
    expect(motivoXml("ENTRADA")).toBe(MOTIVO_XML_TERCEROS);
    expect(motivoXml("SALIDA")).toBe(MOTIVO_XML_EXTERNO);
  });
});

describe("csvRegistro", () => {
  it("genera encabezado y filas separadas por punto y coma", () => {
    const docs: DocumentoRegistro[] = [
      {
        tipoDte: 33,
        folio: 1004,
        fecha: "2026-09-15",
        contraparteRut: "12345678-5",
        contraparteRazonSocial: "Señores & Cía",
        neto: 1000000,
        exento: 0,
        iva: 190000,
        total: 1190000,
        estado: "ACEPTADO",
        xmlLocal: true,
      },
      {
        tipoDte: 33,
        folio: 1005,
        fecha: "2026-09-20",
        contraparteRut: null,
        contraparteRazonSocial: "ACME; SpA", // ; → entrecomillado
        neto: 0,
        exento: 5000,
        iva: 0,
        total: 5000,
        estado: null,
        xmlLocal: false,
        motivoSinXml: MOTIVO_XML_TERCEROS,
      },
    ];
    const csv = csvRegistro(docs);
    const lineas = csv.trimEnd().split("\r\n");
    expect(lineas[0]).toBe(
      "Tipo;Folio;Fecha;RUT Contraparte;Razon Social;Monto Neto;Monto Exento;Monto IVA;Monto Total;Estado;XML local",
    );
    expect(lineas[1]).toBe(
      "33;1004;2026-09-15;12345678-5;Señores & Cía;1000000;0;190000;1190000;ACEPTADO;si",
    );
    // Razon social con ; entrecomillada y comillas duplicadas.
    expect(lineas[2]).toContain('"ACME; SpA"');
    expect(lineas[2].endsWith(";no")).toBe(true);
    expect(csvRegistro([])).toContain("Tipo;Folio");
  });
});

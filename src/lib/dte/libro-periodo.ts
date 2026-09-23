/**
 * Carga de documentos por periodo para el Libro de Compras y Ventas.
 * Compartida por la ruta API de descarga y la página /libros para que
 * ambos muestren exactamente el mismo conjunto de documentos.
 */
import { db } from "@/lib/db";
import type { LibroDocumento, LibroSentido } from "./libro";

const PERIODO_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export type PeriodoBounds = { gte: Date; lt: Date };

/**
 * Límites del periodo en hora local: la BD guarda `fechaEmision` como
 * `T12:00:00` local, así que los cortes locales evitan corrimientos de
 * zona horaria en los extremos del mes.
 */
export function periodoBounds(periodo: string): PeriodoBounds | null {
  const m = PERIODO_RE.exec(periodo);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  return { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
}

/** Sentido del dominio → TipoOperacion del libro. */
export function sentidoLibro(sentido: "SALIDA" | "ENTRADA"): LibroSentido {
  return sentido === "SALIDA" ? "VENTA" : "COMPRA";
}

/** Nombre del archivo de descarga: libro-ventas-2026-09.xml. */
export function nombreLibro(sentido: "SALIDA" | "ENTRADA", periodo: string): string {
  const lado = sentido === "SALIDA" ? "ventas" : "compras";
  return `libro-${lado}-${periodo}.xml`;
}

/**
 * Documentos del periodo listos para el libro (ACEPTADO/ANULADO con
 * folio), con la contraparte según el sentido: receptor en ventas,
 * proveedor en compras.
 */
export async function documentosDelPeriodo(
  tenantId: string,
  sentido: "SALIDA" | "ENTRADA",
  periodo: string,
): Promise<LibroDocumento[]> {
  const bounds = periodoBounds(periodo);
  if (!bounds) {
    throw new Error(`Periodo inválido: "${periodo}" (se espera AAAA-MM).`);
  }

  const docs = await db.dteDocument.findMany({
    where: {
      tenantId,
      sentido,
      estado: { in: ["ACEPTADO", "ANULADO"] },
      fechaEmision: { gte: bounds.gte, lt: bounds.lt },
    },
    orderBy: [{ fechaEmision: "asc" }, { folio: "asc" }],
    select: {
      tipoDte: true,
      folio: true,
      fechaEmision: true,
      receptorRut: true,
      receptorRazonSocial: true,
      emisorRut: true,
      emisorRazonSocial: true,
      neto: true,
      mntExe: true,
      iva: true,
      total: true,
      estado: true,
    },
  });

  return docs.map((d) => ({
    tipoDte: d.tipoDte,
    folio: d.folio,
    fechaEmision: d.fechaEmision,
    contraparteRut: sentido === "SALIDA" ? d.receptorRut : d.emisorRut,
    contraparteRazonSocial:
      sentido === "SALIDA" ? d.receptorRazonSocial : d.emisorRazonSocial,
    neto: d.neto,
    mntExe: d.mntExe,
    iva: d.iva,
    total: d.total,
    estado: d.estado,
  }));
}

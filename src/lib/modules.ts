/**
 * Registro de módulos activables por tenant. El panel (launcher) muestra
 * el registro completo; la barra de navegación y las páginas filtran por
 * lo activado. FACTURACION/COMPRAS quedaron consolidados en ERP.
 */
import { db } from "@/lib/db";

export type ModuloKey = "ERP" | "LIBROS" | "REPORTES";

export type DefinicionModulo = {
  key: ModuloKey;
  href: string;
  nombre: string;
  descripcion: string;
  /** Sigla tipográfica del tile del portal (mono sobre navy). */
  sigla: string;
  /** Distintivo "Nuevo" para el módulo incorporado más reciente. */
  nuevo?: boolean;
};

export const MODULOS: DefinicionModulo[] = [
  {
    key: "ERP",
    href: "/erp",
    nombre: "ERP",
    descripcion:
      "Ventas y compras en un solo lugar: emisión de DTE, registro de proveedores, clasificación y anulación.",
    sigla: "ERP",
    nuevo: true,
  },
  {
    key: "LIBROS",
    href: "/libros",
    nombre: "Libros",
    descripcion:
      "Libro de compras y ventas por periodo, con el XML oficial y el registro CSV.",
    sigla: "LIB",
  },
  {
    key: "REPORTES",
    href: "/reportes",
    nombre: "Reportes",
    descripcion:
      "Ventas por vendedor, compras por área y categoría, y top de proveedores del periodo.",
    sigla: "REP",
  },
];

/** Módulos activados por defecto; el resto se activa desde el panel. */
export const MODULOS_CORE: ModuloKey[] = ["ERP", "LIBROS"];

const KEYS = new Set<string>(MODULOS.map((m) => m.key));

/** Guarda de tipos para claves que vienen de la API. */
export function esModuloKey(valor: unknown): valor is ModuloKey {
  return typeof valor === "string" && KEYS.has(valor);
}

/** Set de módulos activos del tenant (filas presentes en TenantModule). */
export async function modulosActivos(tenantId: string): Promise<Set<ModuloKey>> {
  const filas = await db.tenantModule.findMany({
    where: { tenantId },
    select: { key: true },
  });
  const activos = new Set<ModuloKey>();
  for (const fila of filas) {
    if (esModuloKey(fila.key)) activos.add(fila.key);
  }
  return activos;
}

/**
 * Registro de módulos activables por tenant. El panel (launcher) muestra
 * el registro completo; la barra de navegación y las páginas filtran por
 * lo activado. Añadir un módulo nuevo = sumarlo aquí + su página + la
 * enum ModuleKey de Prisma.
 */
import { db } from "@/lib/db";

export type ModuloKey = "FACTURACION" | "COMPRAS" | "LIBROS" | "REPORTES";

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
    key: "FACTURACION",
    href: "/facturacion",
    nombre: "Facturación",
    descripcion:
      "Emite facturas, guías y notas al SII, consulta estados y anula con nota de crédito.",
    sigla: "FAC",
  },
  {
    key: "COMPRAS",
    href: "/compras",
    nombre: "Compras",
    descripcion:
      "Registra facturas de proveedores y clasifícalas por área y categoría.",
    sigla: "COM",
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
    nuevo: true,
  },
];

/** Módulos activados por defecto; el resto se activa desde el panel. */
export const MODULOS_CORE: ModuloKey[] = ["FACTURACION", "COMPRAS", "LIBROS"];

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
  return new Set(filas.map((f) => f.key));
}

import Link from "next/link";
import type { ModuloKey } from "@/lib/modules";

type ModuleId =
  | "facturacion"
  | "compras"
  | "libros"
  | "reportes"
  | "configuracion";

const LINKS: Array<{
  id: ModuleId;
  /** Clave del registro de módulos; configuración no es un módulo. */
  key?: ModuloKey;
  href: string;
  label: string;
}> = [
  { id: "facturacion", key: "FACTURACION", href: "/facturacion", label: "Facturación" },
  { id: "compras", key: "COMPRAS", href: "/compras", label: "Compras" },
  { id: "libros", key: "LIBROS", href: "/libros", label: "Libros" },
  { id: "reportes", key: "REPORTES", href: "/reportes", label: "Reportes" },
  { id: "configuracion", href: "/configuracion", label: "Configuración" },
];

/**
 * Horizontal nav shared by the module pages. `activos` filtra los módulos
 * activados por el tenant; sin `activos` se muestran todos (backwards-safe).
 */
export function ModuleNav({
  active,
  activos,
  hideConfig = false,
}: {
  active?: ModuleId;
  activos?: ModuloKey[];
  /** Configuración is manager-only; hide the link from members. */
  hideConfig?: boolean;
}) {
  const visibles = LINKS.filter((link) => {
    if (link.id === "configuracion") return !hideConfig;
    if (!activos) return true;
    return link.key ? activos.includes(link.key) : true;
  });

  return (
    <nav className="flex flex-wrap gap-2">
      {visibles.map((link) => (
        <Link
          key={link.id}
          href={link.href}
          aria-current={active === link.id ? "page" : undefined}
          className={
            active === link.id
              ? "rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white transition hover:bg-navy-hover"
              : "rounded-md px-3 py-1.5 text-sm text-blue transition hover:bg-blue-bright hover:text-white"
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

import Link from "next/link";

type ModuleId = "facturacion" | "compras" | "libros" | "configuracion";

const LINKS: Array<{ id: ModuleId; href: string; label: string }> = [
  { id: "facturacion", href: "/facturacion", label: "Facturación" },
  { id: "compras", href: "/compras", label: "Compras" },
  { id: "libros", href: "/libros", label: "Libros" },
  { id: "configuracion", href: "/configuracion", label: "Configuración" },
];

/** Horizontal nav shared by the commercial module pages. */
export function ModuleNav({
  active,
  hideConfig = false,
}: {
  active?: ModuleId;
  /** Configuración is manager-only; hide the link from members. */
  hideConfig?: boolean;
}) {
  return (
    <nav className="flex flex-wrap gap-2">
      {LINKS.filter((l) => !(hideConfig && l.id === "configuracion")).map(
        (link) => (
          <Link
            key={link.id}
            href={link.href}
            className={
              active === link.id
                ? "rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white transition hover:bg-navy-hover"
                : "rounded-md px-3 py-1.5 text-sm text-blue transition hover:bg-blue-bright hover:text-white"
            }
          >
            {link.label}
          </Link>
        ),
      )}
    </nav>
  );
}

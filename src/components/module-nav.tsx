import Link from "next/link";

type ModuleId = "facturacion" | "compras" | "configuracion";

const LINKS: Array<{ id: ModuleId; href: string; label: string }> = [
  { id: "facturacion", href: "/facturacion", label: "Facturación" },
  { id: "compras", href: "/compras", label: "Compras" },
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
                ? "rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                : "rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }
          >
            {link.label}
          </Link>
        ),
      )}
    </nav>
  );
}

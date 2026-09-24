"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type SidebarItem = { href: string; label: string };
export type SidebarGrupo = { titulo: string; items: SidebarItem[] };

/** La página activa: en /erp distingue Ventas/Compras por ?sentido. */
function esActivo(href: string, pathname: string, sentido: string): boolean {
  const path = href.split("?")[0];
  if (path !== pathname) return false;
  if (path === "/erp") {
    const sentidoItem = href.includes("sentido=ENTRADA") ? "ENTRADA" : "SALIDA";
    return sentidoItem === sentido;
  }
  return true;
}

/**
 * Sidebar de módulos al estilo ERP: grupos verticales fijos a la izquierda
 * en escritorio y una fila de accesos directos en móvil. La página activa
 * se marca con aria-current.
 */
export function Sidebar({ grupos }: { grupos: SidebarGrupo[] }) {
  const pathname = usePathname();
  const sentidoParam = useSearchParams().get("sentido");
  const sentido = sentidoParam === "ENTRADA" ? "ENTRADA" : "SALIDA";
  const enlaces = grupos.flatMap((g) => g.items);

  return (
    <>
      <nav aria-label="Módulos" className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-24 space-y-6">
          {grupos.map((grupo) => (
            <div key={grupo.titulo} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                {grupo.titulo}
              </p>
              {grupo.items.map((item) => {
                const activo = esActivo(item.href, pathname, sentido);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={activo ? "page" : undefined}
                    className={
                      activo
                        ? "block rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white"
                        : "block rounded-md px-3 py-1.5 text-sm text-blue transition hover:bg-block hover:text-ink"
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      <nav
        aria-label="Módulos"
        className="flex w-full flex-wrap gap-2 lg:hidden"
      >
        {enlaces.map((item) => {
          const activo = esActivo(item.href, pathname, sentido);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={activo ? "page" : undefined}
              className={
                activo
                  ? "rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-md border border-line px-3 py-1.5 text-sm text-blue"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

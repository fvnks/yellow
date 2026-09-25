"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";

export type SidebarItem = { href: string; label: string };
export type SidebarGrupo = { titulo: string; items: SidebarItem[] };

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
 * Sidebar con grupos colapsables y indicador de accent.
 */
export function Sidebar({ grupos }: { grupos: SidebarGrupo[] }) {
  const pathname = usePathname();
  const sentidoParam = useSearchParams().get("sentido");
  const sentido = sentidoParam === "ENTRADA" ? "ENTRADA" : "SALIDA";
  const enlaces = grupos.flatMap((g) => g.items);

  const [abiertos, setAbiertos] = useState<Set<string>>(() => {
    const iniciales = new Set<string>();
    for (const grupo of grupos) {
      if (grupo.items.some((item) => esActivo(item.href, pathname, sentido))) {
        iniciales.add(grupo.titulo);
      }
    }
    return iniciales;
  });

  function alternar(titulo: string) {
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(titulo)) next.delete(titulo);
      else next.add(titulo);
      return next;
    });
  }

  return (
    <>
      <nav aria-label="Módulos" className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-24 space-y-4">
          {grupos.map((grupo) => {
            const abierto = abiertos.has(grupo.titulo);
            return (
              <div key={grupo.titulo} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => alternar(grupo.titulo)}
                  aria-expanded={abierto}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint transition hover:bg-raised hover:text-muted"
                >
                  {grupo.titulo}
                  <CaretDown
                    size={12}
                    weight="bold"
                    aria-hidden
                    className={`shrink-0 transition-transform duration-200 ${abierto ? "rotate-0" : "-rotate-90"}`}
                  />
                </button>
                {abierto &&
                  grupo.items.map((item) => {
                    const activo = esActivo(item.href, pathname, sentido);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={activo ? "page" : undefined}
                        className={
                          activo
                            ? "flex items-center rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-bg"
                            : "flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-raised hover:text-ink"
                        }
                      >
                        {activo && (
                          <span
                            aria-hidden
                            className="mr-2 h-3.5 w-1 rounded-full bg-accent"
                          />
                        )}
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
            );
          })}
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
                  ? "rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-bg"
                  : "rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted"
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

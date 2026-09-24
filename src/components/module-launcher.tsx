"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type ModuloLauncher = {
  key: string;
  href: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  /** Sigla tipográfica del tile del portal (mono sobre navy). */
  sigla: string;
  /** Distintivo "Nuevo" para el módulo incorporado más reciente. */
  nuevo?: boolean;
};

/**
 * Portal de módulos del panel, al estilo Portal Defontana: un tile por
 * módulo con sigla, nombre y descripción de una línea. Los activos entran;
 * los inactivos se activan ahí mismo (solo OWNER/ADMIN, la API rechaza al
 * resto). "Nuevo" marca el módulo incorporado más reciente.
 */
export function ModuleLauncher({
  tenantId,
  modulos,
  canManage,
}: {
  tenantId: string;
  modulos: ModuloLauncher[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [activos, setActivos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(modulos.map((m) => [m.key, m.activo])),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function activar(key: string) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/modules`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, activo: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo activar el módulo");
        return;
      }
      setActivos((prev) => ({ ...prev, [key]: true }));
      setNotice("Módulo activado para todo el equipo.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section id="launcher-modulos" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium text-ink">Tus módulos</h2>
        <p className="text-xs text-ink-soft">
          {canManage
            ? "Activa lo que tu empresa use; el resto del equipo lo verá de inmediato."
            : "Un administrador decide qué módulos usa la empresa."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {modulos.map((m) => {
          const activo = activos[m.key];
          return (
            <article
              key={m.key}
              className={
                activo
                  ? "panel flex flex-col gap-4 p-6 shadow-sm shadow-navy/10 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-navy/15"
                  : "flex flex-col gap-4 rounded-md border border-dashed border-line bg-gradient-to-br from-block to-panel p-6"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  aria-hidden
                  className={
                    activo
                      ? "inline-flex h-10 w-10 items-center justify-center rounded-md bg-navy font-mono text-sm font-semibold text-white"
                      : "inline-flex h-10 w-10 items-center justify-center rounded-md bg-block font-mono text-sm font-semibold text-ink-soft"
                  }
                >
                  {m.sigla}
                </span>
                <span className="flex items-center gap-1.5">
                  {m.nuevo && <span className="chip chip-orange">Nuevo</span>}
                  <span className={activo ? "chip chip-ok" : "chip chip-muted"}>
                    {activo ? "Activo" : "Inactivo"}
                  </span>
                </span>
              </div>

              <div className="flex-1 space-y-1.5">
                <h3 className="text-lg font-semibold text-ink">{m.nombre}</h3>
                <p className="text-sm leading-relaxed text-ink-soft">
                  {m.descripcion}
                </p>
              </div>

              {activo ? (
                <Link href={m.href} className="btn btn-primary self-start">
                  Entrar
                </Link>
              ) : canManage ? (
                <button
                  type="button"
                  onClick={() => activar(m.key)}
                  disabled={busy === m.key}
                  className="btn btn-ghost self-start"
                >
                  {busy === m.key ? "Activando…" : "Activar"}
                </button>
              ) : (
                <span className="text-xs text-ink-soft">
                  Pídele a un administrador que lo active
                </span>
              )}
            </article>
          );
        })}
      </div>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="alert alert-ok" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}

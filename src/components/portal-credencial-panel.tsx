"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Guarda la clave tributaria del portal SII (cifrada con AES-256-GCM) que
 * alimenta el Registro CSV real de /libros. Se monta sólo para OWNER/ADMIN
 * (Facturación); la clave nunca se vuelve a leer desde el servidor, sólo
 * se reemplaza o elimina.
 */
export function PortalCredencialPanel({
  tenantId,
  credential,
}: {
  tenantId: string;
  credential: { rut: string; createdAt: string } | null;
}) {
  const router = useRouter();
  const [rut, setRut] = useState(credential?.rut ?? "");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/portal-credential`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rut, clave }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudieron guardar las credenciales");
        return;
      }
      setClave("");
      setNotice(
        "Credenciales guardadas: el Registro CSV de Libros usará el registro real del SII.",
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function eliminar() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/portal-credential`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudieron eliminar las credenciales");
        return;
      }
      setNotice(
        "Credenciales eliminadas: el Registro CSV de Libros vuelve al modo simulado.",
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-ink">
          Portal SII — clave tributaria (registro CSV)
        </h2>
        <p className="text-sm text-ink-soft">
          Abre la sesión del portal para exportar el registro real de compras
          y ventas desde <span className="font-mono">/libros</span> (botón
          «Registro CSV»). Se guarda cifrada, no se muestra nunca y sin ella
          la exportación trabaja en modo simulado con los documentos de
          Yellow.
        </p>
      </div>

      {credential && (
        <p className="text-sm text-ink-soft">
          Guardadas para el RUT{" "}
          <span className="font-mono text-ink">{credential.rut}</span> el{" "}
          {new Date(credential.createdAt).toLocaleDateString("es-CL")}. Al
          actualizar se reemplaza la clave.
        </p>
      )}

      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {notice && <p className="alert alert-ok" role="status">{notice}</p>}

      <form onSubmit={guardar} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-ink">RUT</span>
            <input
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              placeholder="76543210-3"
              className="field font-mono"
              autoComplete="off"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-ink">Clave tributaria</span>
            <input
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="mínimo 8 caracteres"
              className="field"
              autoComplete="new-password"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy || !rut.trim() || clave.length < 8}
            className="btn btn-primary"
          >
            {busy ? "Guardando…" : credential ? "Actualizar" : "Guardar"}
          </button>
          {credential && (
            <button
              type="button"
              onClick={eliminar}
              disabled={busy}
              className="btn btn-danger"
            >
              Eliminar
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

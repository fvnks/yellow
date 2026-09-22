"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EmisorInitial = {
  rut: string;
  razonSocial: string;
  giro: string;
  actividadEconomica: string;
  direccion: string;
  comuna: string;
  emailSii: string;
  resolucionNumero: string;
  resolucionFecha: string;
};

const FIELDS: Array<{
  key: keyof EmisorInitial;
  label: string;
  placeholder?: string;
  type?: string;
}> = [
  { key: "razonSocial", label: "Razón social", placeholder: "Mi Empresa SpA" },
  { key: "rut", label: "RUT", placeholder: "76.543.210-3" },
  { key: "giro", label: "Giro", placeholder: "Software" },
  { key: "actividadEconomica", label: "Actividad (ACTEco)", placeholder: "620200" },
  { key: "direccion", label: "Dirección", placeholder: "Av. Ejemplo 123" },
  { key: "comuna", label: "Comuna", placeholder: "Santiago" },
  { key: "emailSii", label: "Email SII (opcional)", type: "email" },
  { key: "resolucionNumero", label: "N° resolución SII", type: "number" },
  { key: "resolucionFecha", label: "Fecha resolución", type: "date" },
];

export function EmisorForm({
  tenantId,
  initial,
}: {
  tenantId: string;
  initial: EmisorInitial;
}) {
  const router = useRouter();
  const [form, setForm] = useState<EmisorInitial>(initial);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const completo = !!(
    form.rut &&
    form.razonSocial &&
    form.giro &&
    form.actividadEconomica &&
    form.direccion &&
    form.comuna
  );

  function set(key: keyof EmisorInitial, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(form)) {
        if (value !== "") payload[key] = value;
      }
      if (payload.resolucionNumero !== undefined) {
        payload.resolucionNumero = Number(payload.resolucionNumero);
      }
      const res = await fetch(`/api/tenants/${tenantId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.issues?.[0]?.message;
        setError(detail ? `${data.error}: ${detail}` : (data.error ?? "No se pudo guardar"));
        return;
      }
      setNotice("Perfil de emisor guardado.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Perfil del emisor
        </h2>
        <span
          className={`rounded px-2 py-0.5 text-xs ${
            completo
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          }`}
        >
          {completo ? "listo para emitir" : "incompleto"}
        </span>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {notice}
        </p>
      )}

      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((field) => (
          <label key={field.key} className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">{field.label}</span>
            <input
              type={field.type ?? "text"}
              value={form[field.key]}
              onChange={(e) => set(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700"
            />
          </label>
        ))}
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {busy ? "Guardando…" : "Guardar perfil"}
          </button>
        </div>
      </form>
    </section>
  );
}

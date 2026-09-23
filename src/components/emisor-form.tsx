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
        <h2 className="text-lg font-semibold text-ink">Perfil del emisor</h2>
        <span className={completo ? "chip chip-ok" : "chip chip-orange"}>
          {completo ? "listo para emitir" : "incompleto"}
        </span>
      </div>

      {error && <p className="alert alert-error">{error}</p>}
      {notice && <p className="alert alert-ok">{notice}</p>}

      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((field) => (
          <label key={field.key} className="space-y-1 text-sm">
            <span className="text-ink">{field.label}</span>
            <input
              type={field.type ?? "text"}
              value={form[field.key]}
              onChange={(e) => set(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="field"
            />
          </label>
        ))}
        <div className="flex items-end">
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? "Guardando…" : "Guardar perfil"}
          </button>
        </div>
      </form>
    </section>
  );
}

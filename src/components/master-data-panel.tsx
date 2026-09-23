"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type MasterField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "email";
};

type MasterItem = {
  id: string;
  activo: boolean;
  [key: string]: unknown;
};

/**
 * Generic CRUD list + create form for tenant master data
 * (vendedores, centros de costo, categorías). Edit = activate/deactivate;
 * creating/patching requires OWNER/ADMIN (the API enforces it).
 */
export function MasterDataPanel({
  tenantId,
  apiPath,
  title,
  hint,
  fields,
  items,
  itemNoun,
}: {
  tenantId: string;
  /** API segment, e.g. "vendedores". */
  apiPath: string;
  title: string;
  hint?: string;
  fields: MasterField[];
  items: MasterItem[];
  /** Noun used in messages, e.g. "vendedor". */
  itemNoun: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/${apiPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          Object.fromEntries(
            Object.entries(values).filter(([, v]) => v !== ""),
          ),
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.issues?.[0]?.message;
        setError(detail ? `${data.error}: ${detail}` : (data.error ?? "No se pudo crear"));
        return;
      }
      setNotice(`'${values[fields[0].key]}' creado.`);
      setValues({});
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: MasterItem) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/${apiPath}/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activo: !item.activo }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo actualizar");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {hint && <p className="text-sm text-ink-soft">{hint}</p>}
      </div>

      {error && <p className="alert alert-error">{error}</p>}
      {notice && <p className="alert alert-ok">{notice}</p>}

      <form
        onSubmit={submit}
        className="flex flex-wrap items-end gap-3 rounded-md bg-block p-3"
      >
        {fields.map((field) => (
          <label key={field.key} className="min-w-40 flex-1 space-y-1 text-sm">
            <span className="text-ink">{field.label}</span>
            <input
              required
              type={field.type ?? "text"}
              value={values[field.key] ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [field.key]: e.target.value }))
              }
              placeholder={field.placeholder}
              className="field"
            />
          </label>
        ))}
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Guardando…" : "Agregar"}
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Aún no hay {itemNoun}s. Crea el primero arriba.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm"
            >
              <span className="flex flex-wrap items-center gap-2">
                {fields.map((field) => (
                  <span key={field.key} className="text-ink">
                    {String(item[field.key] ?? "")}
                  </span>
                ))}
                {!item.activo && (
                  <span className="chip chip-muted">inactivo</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => toggle(item)}
                disabled={busy}
                className="btn btn-ghost"
              >
                {item.activo ? "Desactivar" : "Activar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

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

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700";

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
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
        {hint && <p className="text-sm text-zinc-500">{hint}</p>}
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

      <form
        onSubmit={submit}
        className="flex flex-wrap items-end gap-3 rounded-lg bg-zinc-100 p-3 dark:bg-zinc-900"
      >
        {fields.map((field) => (
          <label key={field.key} className="min-w-40 flex-1 space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">{field.label}</span>
            <input
              required
              type={field.type ?? "text"}
              value={values[field.key] ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [field.key]: e.target.value }))
              }
              placeholder={field.placeholder}
              className={inputClass}
            />
          </label>
        ))}
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? "Guardando…" : "Agregar"}
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aún no hay {itemNoun}s. Crea el primero arriba.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-800">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm"
            >
              <span className="flex flex-wrap items-center gap-2">
                {fields.map((field) => (
                  <span key={field.key} className="text-zinc-800 dark:text-zinc-200">
                    {String(item[field.key] ?? "")}
                  </span>
                ))}
                {!item.activo && (
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                    inactivo
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => toggle(item)}
                disabled={busy}
                className="rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
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

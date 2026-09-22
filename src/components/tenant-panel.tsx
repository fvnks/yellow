"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Membership = {
  tenantId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  tenant: { id: string; name: string; slug: string };
};

export function TenantPanel({
  memberships,
  activeTenantId,
}: {
  memberships: Membership[];
  activeTenantId: string | null;
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function switchTenant(tenantId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tenants/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "No se pudo cambiar de tenant");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function createTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "No se pudo crear el tenant");
        return;
      }
      setNewName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        Tus espacios de trabajo
      </h2>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <ul className="space-y-2">
        {memberships.map((m) => {
          const isActive = m.tenantId === activeTenantId;
          return (
            <li
              key={m.tenantId}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                isActive
                  ? "border-zinc-900 dark:border-zinc-100"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {m.tenant.name}
                  {isActive && (
                    <span className="ml-2 rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
                      activo
                    </span>
                  )}
                </p>
                <p className="text-xs text-zinc-500">
                  {m.tenant.slug} · {m.role}
                </p>
              </div>
              {!isActive && (
                <button
                  onClick={() => switchTenant(m.tenantId)}
                  disabled={busy}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cambiar
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <form onSubmit={createTenant} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nuevo espacio de trabajo"
          maxLength={100}
          className="flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Crear
        </button>
      </form>
    </section>
  );
}

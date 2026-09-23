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
      <h2 className="text-lg font-semibold text-ink">
        Tus espacios de trabajo
      </h2>

      {error && <p className="alert alert-error" role="alert">{error}</p>}

      <ul className="space-y-2">
        {memberships.map((m) => {
          const isActive = m.tenantId === activeTenantId;
          return (
            <li
              key={m.tenantId}
              className={`panel flex items-center justify-between px-4 py-3 ${
                isActive ? "border-navy" : ""
              }`}
            >
              <div>
                <p className="text-sm font-medium text-ink">
                  {m.tenant.name}
                  {isActive && <span className="chip chip-navy ml-2">activo</span>}
                </p>
                <p className="text-xs text-ink-soft">
                  {m.tenant.slug} · {m.role}
                </p>
              </div>
              {!isActive && (
                <button
                  onClick={() => switchTenant(m.tenantId)}
                  disabled={busy}
                  className="btn btn-ghost"
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
          aria-label="Nombre del nuevo espacio de trabajo"
          placeholder="Nuevo espacio de trabajo"
          maxLength={100}
          className="field flex-1"
        />
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="btn btn-primary"
        >
          Crear
        </button>
      </form>
    </section>
  );
}

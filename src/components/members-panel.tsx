"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Member = {
  userId: string;
  email: string;
  name: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

type Invitation = {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  expiresAt: string;
};

export function MembersPanel({
  tenantId,
  members,
  invitations,
  canManage,
}: {
  tenantId: string;
  members: Member[];
  invitations: Invitation[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLastLink(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la invitación");
        return;
      }
      setLastLink(data.acceptUrl);
      setEmail("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function revoke(invitationId: string) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/invitations/${invitationId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "No se pudo revocar");
        return;
      }
      setNotice("Invitación revocada.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!lastLink) return;
    await navigator.clipboard.writeText(`${window.location.origin}${lastLink}`);
    setNotice("Enlace copiado al portapapeles.");
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        Miembros
      </h2>

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

      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.userId}
            className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
          >
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {m.name ?? m.email}
              </p>
              {m.name && <p className="text-xs text-zinc-500">{m.email}</p>}
            </div>
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {m.role}
            </span>
          </li>
        ))}
      </ul>

      {canManage && (
        <div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <form onSubmit={invite} className="flex flex-wrap gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              className="min-w-48 flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}
              className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none dark:border-zinc-700"
            >
              <option value="MEMBER">Miembro</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Invitar
            </button>
          </form>

          {lastLink && (
            <div className="space-y-2 rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-900">
              <p className="text-zinc-700 dark:text-zinc-300">
                Comparte este enlace (se muestra solo una vez):
              </p>
              <code className="block break-all text-xs text-zinc-600 dark:text-zinc-400">
                {window.location.origin}
                {lastLink}
              </code>
              <button
                onClick={copyLink}
                className="rounded-md border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Copiar enlace
              </button>
            </div>
          )}

          {invitations.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Invitaciones pendientes
              </p>
              <ul className="space-y-2">
                {invitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded-md border border-dashed border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {inv.email} · {inv.role}
                    </span>
                    <button
                      onClick={() => revoke(inv.id)}
                      disabled={busy}
                      className="text-xs text-red-600 underline hover:text-red-800 disabled:opacity-50 dark:text-red-400"
                    >
                      Revocar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

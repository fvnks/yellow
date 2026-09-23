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
      <h2 className="text-lg font-semibold text-ink">Miembros</h2>

      {error && <p className="alert alert-error">{error}</p>}
      {notice && <p className="alert alert-ok">{notice}</p>}

      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.userId}
            className="panel flex items-center justify-between px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-ink">
                {m.name ?? m.email}
              </p>
              {m.name && <p className="text-xs text-ink-soft">{m.email}</p>}
            </div>
            <span className="chip chip-muted">{m.role}</span>
          </li>
        ))}
      </ul>

      {canManage && (
        <div className="panel space-y-4 p-4">
          <form onSubmit={invite} className="flex flex-wrap gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              className="field min-w-48 flex-1"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}
              className="field w-auto"
            >
              <option value="MEMBER">Miembro</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary"
            >
              Invitar
            </button>
          </form>

          {lastLink && (
            <div className="space-y-2 rounded-md bg-block p-3 text-sm">
              <p className="text-ink">
                Comparte este enlace (se muestra solo una vez):
              </p>
              <code className="block break-all text-xs text-ink-soft">
                {window.location.origin}
                {lastLink}
              </code>
              <button onClick={copyLink} className="btn btn-ghost">
                Copiar enlace
              </button>
            </div>
          )}

          {invitations.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">
                Invitaciones pendientes
              </p>
              <ul className="space-y-2">
                {invitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded-md border border-dashed border-line px-3 py-2 text-sm"
                  >
                    <span className="text-ink">
                      {inv.email} · {inv.role}
                    </span>
                    <button
                      onClick={() => revoke(inv.id)}
                      disabled={busy}
                      className="text-xs text-err underline hover:opacity-80 disabled:opacity-50"
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

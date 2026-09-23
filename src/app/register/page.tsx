"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Issue = { path: string; message: string };

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIssues([]);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: name || undefined,
          tenantName: tenantName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al registrarse");
        setIssues(data.issues ?? []);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <form onSubmit={onSubmit} className="panel w-full max-w-sm space-y-4 p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-ink">Crear cuenta</h1>

        {error && <p className="alert alert-error">{error}</p>}
        {issues.map((i) => (
          <p key={i.path + i.message} className="text-xs text-err">
            {i.path}: {i.message}
          </p>
        ))}

        <label className="block space-y-1 text-sm">
          <span className="text-ink">Nombre</span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-ink">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-ink">Contraseña (mín. 8)</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-ink">Nombre del espacio de trabajo</span>
          <input
            type="text"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            placeholder="Mi empresa"
            className="field"
          />
        </label>

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? "Creando…" : "Crear cuenta"}
        </button>

        <p className="text-center text-sm text-ink-soft">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="underline hover:text-orange-ink">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
}

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
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Crear cuenta
        </h1>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        {issues.map((i) => (
          <p key={i.path + i.message} className="text-xs text-red-600 dark:text-red-400">
            {i.path}: {i.message}
          </p>
        ))}

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Nombre</span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Contraseña (mín. 8)</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">
            Nombre del espacio de trabajo
          </span>
          <input
            type="text"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            placeholder="Mi empresa"
            className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {loading ? "Creando…" : "Crear cuenta"}
        </button>

        <p className="text-center text-sm text-zinc-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="underline hover:text-zinc-800 dark:hover:text-zinc-200">
            Inicia sesión
          </Link>
        </p>
      </form>
    </main>
  );
}

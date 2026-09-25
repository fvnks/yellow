"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthAside } from "@/components/auth-aside";

type Issue = { path: string; message: string };

const CAMPOS = ["name", "email", "password", "tenantName"];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);

  const errDe = (campo: string) => issues.filter((i) => i.path === campo);
  const otros = issues.filter((i) => !CAMPOS.includes(i.path));

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
    <div className="grid min-h-[75vh] gap-10 lg:grid-cols-[2fr_3fr] lg:gap-16">
      <AuthAside />
      <div className="flex items-center justify-center py-8">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Crear cuenta
          </h1>

          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}
          {otros.map((i) => (
            <p key={i.path + i.message} role="alert" className="text-xs text-err">
              {i.path}: {i.message}
            </p>
          ))}

          <div className="space-y-5">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-ink">Nombre</span>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={errDe("name").length > 0 || undefined}
                aria-describedby={errDe("name").length > 0 ? "reg-name-error" : undefined}
                className="field"
              />
            </label>
            {errDe("name").length > 0 && (
              <p id="reg-name-error" className="-mt-3 text-xs text-err">
                {errDe("name").map((i) => i.message).join(" · ")}
              </p>
            )}

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-ink">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={errDe("email").length > 0 || undefined}
                aria-describedby={errDe("email").length > 0 ? "reg-email-error" : undefined}
                className="field"
              />
            </label>
            {errDe("email").length > 0 && (
              <p id="reg-email-error" className="-mt-3 text-xs text-err">
                {errDe("email").map((i) => i.message).join(" · ")}
              </p>
            )}

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-ink">
                Contraseña (mín. 8)
              </span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={errDe("password").length > 0 || undefined}
                aria-describedby={errDe("password").length > 0 ? "reg-password-error" : undefined}
                className="field"
              />
            </label>
            {errDe("password").length > 0 && (
              <p id="reg-password-error" className="-mt-3 text-xs text-err">
                {errDe("password").map((i) => i.message).join(" · ")}
              </p>
            )}

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-ink">
                Nombre del espacio de trabajo
              </span>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="Mi empresa"
                aria-invalid={errDe("tenantName").length > 0 || undefined}
                aria-describedby={errDe("tenantName").length > 0 ? "reg-tenant-error" : undefined}
                className="field"
              />
            </label>
            {errDe("tenantName").length > 0 && (
              <p id="reg-tenant-error" className="-mt-3 text-xs text-err">
                {errDe("tenantName").map((i) => i.message).join(" · ")}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-2.5"
          >
            {loading ? "Creando…" : "Crear cuenta"}
          </button>

          <p className="pt-2 text-center text-sm text-faint">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-medium text-ink underline underline-offset-4 transition-colors hover:text-accent-text"
            >
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

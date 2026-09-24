"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthAside } from "@/components/auth-aside";

type Issue = { path: string; message: string };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);

  const errDe = (campo: string) => issues.filter((i) => i.path === campo);
  const otros = issues.filter(
    (i) => i.path !== "email" && i.path !== "password",
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIssues([]);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al iniciar sesión");
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
    <div className="grid min-h-[75vh] gap-8 lg:grid-cols-2 lg:gap-12">
      <AuthAside />
      <div className="flex items-center justify-center">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-semibold text-ink">Iniciar sesión</h1>

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

          <label className="block space-y-1 text-sm">
            <span className="text-ink">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={errDe("email").length > 0 || undefined}
              aria-describedby={errDe("email").length > 0 ? "login-email-error" : undefined}
              className="field"
            />
          </label>
          {errDe("email").length > 0 && (
            <p id="login-email-error" className="text-xs text-err">
              {errDe("email").map((i) => i.message).join(" · ")}
            </p>
          )}

          <label className="block space-y-1 text-sm">
            <span className="text-ink">Contraseña</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={errDe("password").length > 0 || undefined}
              aria-describedby={errDe("password").length > 0 ? "login-password-error" : undefined}
              className="field"
            />
          </label>
          {errDe("password").length > 0 && (
            <p id="login-password-error" className="text-xs text-err">
              {errDe("password").map((i) => i.message).join(" · ")}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? "Entrando…" : "Entrar"}
          </button>

          <p className="text-center text-sm text-ink-soft">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="underline hover:text-orange-ink">
              Regístrate
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

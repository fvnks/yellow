"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Send,
  Users,
  Globe,
  Mail,
  ExternalLink,
  Sun,
  Moon,
  Facebook,
  Twitter,
  Instagram,
  LinkedIn,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

export function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "¡Gracias por suscribirte!");
        setEmail("");
      } else if (res.status === 409) {
        setStatus("success");
        setMessage(data.message || "Este email ya está suscrito");
      } else {
        setStatus("error");
        setMessage(data.error?.email?.[0] || "Error al suscribirse");
      }
    } catch {
      setStatus("error");
      setMessage("Error de conexión. Inténtalo de nuevo.");
    }
  };

  return (
    <footer className="relative border-t border-border bg-surface transition-colors duration-300">
      <TooltipProvider>
        <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            {/* Newsletter */}
            <div className="relative">
              <h2 className="mb-4 text-2xl font-bold tracking-tight text-ink">Mantente conectado</h2>
              <p className="mb-6 text-sm text-muted">
                Únete a nuestra newsletter para recibir actualizaciones y ofertas exclusivas.
              </p>
              <form onSubmit={handleSubmit} className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Tu correo electrónico"
                  disabled={status === "loading"}
                  className="w-full rounded-lg border border-border bg-surface px-4 py-3 pr-12 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="absolute right-1 top-1 h-9 w-9 rounded-full bg-accent text-white hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Suscribirse"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
              {status === "success" && (
                <p className="mt-3 text-sm text-green" role="status">{message}</p>
              )}
              {status === "error" && (
                <p className="mt-3 text-sm text-err" role="alert">{message}</p>
              )}
              <div className="absolute -right-4 top-0 h-24 w-24 rounded-full bg-accent/10 blur-2xl" />
            </div>
                        {/* Enlaces rápidos */}
            <div>
              <h3 className="mb-4 text-base font-semibold text-ink">Enlaces rápidos</h3>
              <nav className="space-y-2 text-sm">
                <Link href="/" className="block transition-colors hover:text-accent">Inicio</Link>
                <Link href="/nosotros" className="block transition-colors hover:text-accent">Nosotros</Link>
                <Link href="/?oferta=erp" className="block transition-colors hover:text-accent">Facturación</Link>
                <Link href="/diseno" className="block transition-colors hover:text-accent">Diseño web</Link>
                <Link href="/contacto" className="block transition-colors hover:text-accent">Contacto</Link>
              </nav>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="mb-4 text-base font-semibold text-ink">Contacto</h3>
              <address className="space-y-2 text-sm not-italic text-muted">
                <p>Av. Providencia 123, Of. 401</p>
                <p>Providencia, Santiago, Chile</p>
                <p>Tel: +56 2 2940 1100</p>
                <p>Email: hola@yellow-erp.cl</p>
              </address>
            </div>

            {/* Redes sociales + dark mode toggle */}
            <div className="relative">
              <h3 className="mb-4 text-base font-semibold text-ink">Síguenos</h3>
              <div className="mb-6 flex space-x-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href="https://facebook.com/yellowerp" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-accent hover:text-accent focus-ring" aria-label="Sitio web"><Users className="h-5 w-5" /></a>
                    </TooltipTrigger>
                    <TooltipContent><p>Visita nuestro sitio</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href="https://twitter.com/yellowerp" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-accent hover:text-accent focus-ring" aria-label="Email"><Globe className="h-5 w-5" /></a>
                    </TooltipTrigger>
                    <TooltipContent><p>Escríbenos un email</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href="https://instagram.com/yellowerp" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-accent hover:text-accent focus-ring" aria-label="Contacto"><Mail className="h-5 w-5" /></a>
                    </TooltipTrigger>
                    <TooltipContent><p>Contáctanos</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href="https://linkedin.com/company/yellowerp" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-accent hover:text-accent focus-ring" aria-label="LinkedIn"><ExternalLink className="h-5 w-5" /></a>
                    </TooltipTrigger>
                    <TooltipContent><p>Conéctate en LinkedIn</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-muted" />
                <ThemeToggle />
                <Moon className="h-4 w-4 text-muted" />
              </div>
            </div>
          </div>

          {/* Copyright y legal */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-center md:flex-row">
            <p className="text-sm text-muted">© {new Date().getFullYear()} Yellow. Todos los derechos reservados.</p>
            <nav className="flex gap-4 text-sm">
              <Link href="/privacidad" className="transition-colors hover:text-accent">Privacidad</Link>
              <Link href="/terminos" className="transition-colors hover:text-accent">Términos</Link>
              <Link href="/cookies" className="transition-colors hover:text-accent">Cookies</Link>
            </nav>
          </div>
        </div>
      </TooltipProvider>
    </footer>
  );
}

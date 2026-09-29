"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PillButton } from "@/components/pill-button";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { label: "Inicio", href: "/" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Facturación", href: "/?oferta=erp" },
  { label: "Diseño web", href: "/diseno" },
  { label: "Contacto", href: "/contacto" },
];

export function HeaderNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled ? "bg-bg/90 backdrop-blur-md border-b border-border" : "bg-transparent"
      }`}
      role="banner"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 transition-colors hover:text-ink focus-ring"
          aria-label="Yellow, ir al inicio"
        >
          <span aria-hidden className="h-5 w-5 rounded-md bg-accent" />
          <span className="text-lg font-bold tracking-tight text-ink">Yellow</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex md:items-center md:gap-6" aria-label="Principal">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted transition-colors hover:text-ink focus-ring rounded-md px-2 py-1"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex md:items-center md:gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center px-4 text-sm font-medium text-muted underline underline-offset-4 transition-colors hover:text-ink focus-ring rounded-full"
          >
            Ingresar
          </Link>
          <PillButton
            href="/register"
            className="btn-primary min-h-11 px-5 text-sm focus-ring"
          >
            Empezar gratis
          </PillButton>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden inline-flex min-h-11 items-center justify-center p-2 rounded-full text-muted transition-colors hover:text-ink focus-ring"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {mobileOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="md:hidden border-t border-border bg-bg px-4 py-4 animate-slide-down"
          role="navigation"
          aria-label="Móvil"
        >
          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="min-h-11 inline-flex items-center px-3 text-base font-medium text-ink hover:text-accent focus-ring rounded-lg"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <ThemeToggle />
              <Link
                href="/login"
                className="min-h-11 inline-flex items-center justify-center px-3 text-base font-medium text-muted hover:text-ink focus-ring rounded-lg"
                onClick={() => setMobileOpen(false)}
              >
                Ingresar
              </Link>
              <Link
                href="/register"
                className="btn-primary min-h-11 px-5 text-base focus-ring inline-flex items-center justify-center"
                onClick={() => setMobileOpen(false)}
              >
                Empezar gratis
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
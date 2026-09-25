import Link from "next/link";
import { getAuthContext } from "@/lib/session";
import { SOPORTE_EMAIL } from "@/lib/contacto";
import { LandingHero } from "@/components/landing-hero";
import { LandingFeatures } from "@/components/landing-features";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function Home() {
  const ctx = await getAuthContext();

  return (
    <div className="pb-24">
      {/* ═══ NAV: menú principal de la landing ═══ */}
      <nav className="flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden className="h-5 w-5 rounded-md bg-accent" />
          <span className="text-lg font-bold tracking-tight text-ink">
            Yellow
          </span>
        </Link>
        <div className="hidden items-center gap-7 text-sm font-medium text-muted md:flex">
          <a
            href="#funciones"
            className="transition-colors hover:text-ink"
          >
            Funciones
          </a>
          <a
            href="#como-empezas"
            className="transition-colors hover:text-ink"
          >
            Cómo funciona
          </a>
          <Link
            href="/diseno"
            className="transition-colors hover:text-ink"
          >
            Diseño web
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {ctx ? (
            <Link href="/dashboard" className="btn btn-primary text-sm">
              Ir al panel
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost text-sm">
                Ingresar
              </Link>
              <Link href="/register" className="btn btn-primary text-sm">
                Empezar gratis
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ═══ HERO: energía cálida + preview de la app ═══ */}
      <LandingHero isAuthed={!!ctx} />

      {/* ═══ FEATURES: con iconos y acento de color ═══ */}
      <section
        id="funciones"
        className="border-t border-border py-20 md:py-28"
      >
        <div className="mb-14 max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Un ERP que hace el trabajo
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Emisión, compras, gastos, cotizaciones, libros y reportes. Todo en
            un producto, con el XML y el PDF de cada documento en su fila.
          </p>
        </div>

        <LandingFeatures />
      </section>

      {/* ═══ CÓMO EMPIEZAS: con línea conectora ═══ */}
      <section
        id="como-empezas"
        className="border-t border-border py-20 md:py-24"
      >
        <div className="mb-14">
          <h2 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
            Cómo empiezas
          </h2>
        </div>
        <div className="relative">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-7 hidden h-px bg-border md:block"
          />
          <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              { n: "1", titulo: "Crea tu cuenta", desc: "Tu empresa, tu equipo, aislados por espacio de trabajo." },
              { n: "2", titulo: "Sube tu certificado", desc: "O parte en modo simulado, sin .p12." },
              { n: "3", titulo: "Emite y registra", desc: "El XML y el PDF de cada documento, en su fila." },
            ].map((paso) => (
              <li key={paso.n} className="relative">
                <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface font-mono text-xl font-bold text-accent-text shadow-sm">
                  {paso.n}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-ink">
                  {paso.titulo}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {paso.desc}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ═══ CTA: panel oscuro con peso visual ═══ */}
      <section id="contacto" className="pt-8">
        <div className="relative overflow-hidden rounded-2xl bg-ink px-8 py-16 text-center md:px-16 md:py-20">
          {/* Glow accent dentro del panel */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-64 w-[32rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-accent/8 blur-3xl"
          />

          <div className="relative">
            <h2 className="mx-auto max-w-xl text-3xl font-bold tracking-tight text-bg md:text-4xl">
              Empieza hoy, sin certificado
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-bg/60">
              Yellow funciona en modo simulado desde el primer minuto. Sube tu
              .p12 cuando estés listo y las mismas pantallas hablan con el SII
              real.
            </p>
            <div className="mt-8">
              {ctx ? (
                <Link
                  href="/dashboard"
                  className="btn btn-accent px-8 py-3 text-base"
                >
                  Ir al panel
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="btn btn-accent px-8 py-3 text-base"
                >
                  Crear cuenta
                </Link>
              )}
            </div>
            <p className="mt-6 text-sm text-bg/40">
              {SOPORTE_EMAIL ? (
                <>
                  ¿Dudas?{" "}
                  <a
                    href={`mailto:${SOPORTE_EMAIL}`}
                    className="text-bg/60 underline underline-offset-4"
                  >
                    {SOPORTE_EMAIL}
                  </a>
                </>
              ) : (
                "Sin compromiso. Crea tu cuenta y pruébalo."
              )}
              {" · "}
              <Link
                href="/diseno"
                className="text-bg/60 underline underline-offset-4"
              >
                ¿Necesitas diseño web?
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

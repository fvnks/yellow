import Link from "next/link";
import { getAuthContext } from "@/lib/session";
import { SOPORTE_EMAIL } from "@/lib/contacto";
import { LandingHero } from "@/components/landing-hero";

export const dynamic = "force-dynamic";

export default async function Home() {
  const ctx = await getAuthContext();

  return (
    <div className="relative space-y-20 overflow-hidden pb-16">
      {/* Lavado de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-bright/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-orange/10 blur-3xl"
      />

      {/* Menú de secciones */}
      <nav
        aria-label="Secciones de la página"
        className="hidden items-center justify-center gap-6 pt-2 text-sm md:flex"
      >
        <a href="#funciones" className="text-blue hover:text-orange-ink">
          Funciones
        </a>
        <a href="#como-empezas" className="text-blue hover:text-orange-ink">
          Cómo funciona
        </a>
        <a href="#contacto" className="text-blue hover:text-orange-ink">
          Contacto
        </a>
      </nav>

      {/* ── Hero centrado: Badge → Título → CTAs → Preview ── */}
      <LandingHero isAuthed={!!ctx} />

      {/* ── Funciones: bento ── */}
      <section id="funciones" className="space-y-8">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Un ERP que hace el trabajo
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <article className="panel space-y-3 p-6 shadow-sm shadow-navy/10 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-navy/15 md:col-span-2">
            <h3 className="text-lg font-semibold text-ink">
              Emisión y anulación
            </h3>
            <p className="max-w-[65ch] text-sm leading-relaxed text-ink-soft">
              Facturas, guías y notas firmadas con TED, con tus CAF y folios
              propios. Anulas con nota de crédito automática.
            </p>
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
              <span className="chip chip-blue">FIRMADO</span> →
              <span className="chip chip-orange">ENVIADO</span> →
              <span className="chip chip-ok">ACEPTADO</span>
            </p>
          </article>

          <article className="space-y-3 rounded-md bg-gradient-to-br from-block to-panel p-6 shadow-sm shadow-navy/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-navy/10">
            <h3 className="text-lg font-semibold text-ink">
              Compras, gastos y cotizaciones
            </h3>
            <p className="text-sm leading-relaxed text-ink-soft">
              Registra facturas de proveedores, gastos de caja con reembolso, y
              cotizaciones que se convierten en venta con un clic.
            </p>
            <p className="flex items-center gap-1.5 text-xs text-ink-soft">
              <span className="chip chip-muted">COT-0042</span>
              <span className="font-medium text-blue">→ Factura</span>
            </p>
          </article>

          <article className="panel space-y-3 p-6 shadow-sm shadow-navy/10 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-navy/15">
            <h3 className="text-lg font-semibold text-ink">
              Libros y registro CSV
            </h3>
            <p className="text-sm leading-relaxed text-ink-soft">
              Libro de compras y ventas por período, con el XML oficial y el
              registro CSV del portal del SII.
            </p>
          </article>

          <article className="space-y-4 rounded-md bg-gradient-to-br from-block to-panel p-6 shadow-sm shadow-navy/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-navy/10 md:col-span-2">
            <h3 className="text-lg font-semibold text-ink">
              Multi-empresa, con roles
            </h3>
            <p className="max-w-[65ch] text-sm leading-relaxed text-ink-soft">
              Varias empresas en una sola cuenta. Invita a tu equipo, elige qué
              módulos activar, y cada documento queda asociado a su vendedor y
              centro de costo.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink shadow-sm">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="h-2.5 w-2.5 bg-orange" />
                  Constructora SpA
                </span>
                <span className="chip chip-muted">OWNER</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink shadow-sm">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="h-2.5 w-2.5 bg-blue" />
                  Café y Alimentos
                </span>
                <span className="chip chip-muted">ADMIN</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* ── Cómo empiezas ── */}
      <section id="como-empezas" className="space-y-8">
        <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Cómo empiezas
        </h2>
        <ol className="divide-y divide-line">
          {[
            {
              n: "01",
              titulo: "Crea tu cuenta",
              detalle: "Tu empresa, tu equipo, aislados por espacio de trabajo.",
            },
            {
              n: "02",
              titulo: "Sube tu certificado",
              detalle: "O parte en modo simulado, sin .p12.",
            },
            {
              n: "03",
              titulo: "Emite y registra",
              detalle: "El XML y el PDF de cada documento, en su fila.",
            },
          ].map((paso) => (
            <li key={paso.n} className="grid gap-2 py-6 md:grid-cols-[7rem_1fr] md:gap-8">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-block font-mono text-base font-medium text-orange-ink shadow-sm">
                {paso.n}
              </span>
              <div>
                <h3 className="font-semibold text-ink">{paso.titulo}</h3>
                <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-ink-soft">
                  {paso.detalle}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Contacto ── */}
      <section
        id="contacto"
        className="rounded-md bg-gradient-to-br from-navy to-navy-hover p-8 md:p-12"
      >
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div className="flex max-w-2xl items-start gap-4">
            <span aria-hidden className="mt-1.5 h-3.5 w-3.5 shrink-0 bg-orange" />
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Parte en modo simulado, pasa a producción cuando estés listo
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/80">
                Sin certificado, Yellow funciona con el adaptador simulado.
                Sube tu .p12 y las mismas pantallas hablan con el SII real.
              </p>
            </div>
          </div>
          {ctx ? (
            <Link
              href="/dashboard"
              className="btn bg-white px-5 py-2.5 text-base text-navy hover:bg-block active:translate-y-px"
            >
              Ir al panel
            </Link>
          ) : (
            <Link
              href="/register"
              className="btn bg-white px-5 py-2.5 text-base text-navy hover:bg-block active:translate-y-px"
            >
              Crear cuenta
            </Link>
          )}
        </div>
        <p className="mt-8 text-xs text-white/70">
          {SOPORTE_EMAIL ? (
            <>
              ¿Dudas?{" "}
              <a
                href={`mailto:${SOPORTE_EMAIL}`}
                className="underline hover:text-white"
              >
                Escríbenos a {SOPORTE_EMAIL}
              </a>
            </>
          ) : (
            "¿Dudas? Crea tu cuenta y pruébalo en modo simulado."
          )}
          {" · "}
          <Link href="/diseno" className="underline hover:text-white">
            ¿Necesitas diseño web? Mira nuestro trabajo
          </Link>
        </p>
      </section>
    </div>
  );
}

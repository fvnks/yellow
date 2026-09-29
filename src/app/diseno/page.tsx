import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { PillButton } from "@/components/pill-button";
import { SOPORTE_EMAIL } from "@/lib/contacto";

export const metadata: Metadata = {
  title: "Diseño web",
  description:
    "Diseñamos sitios que convierten visitas en clientes. Tipografía, color y detalle con intención.",
};

/**
 * Las cuatro capacidades, sin fotografía de stock.
 *
 * Cada tarjeta lleva una composición gráfica propia en CSS (paneles,
 * muestras tipográficas, wireframes) dentro de la paleta: material gráfico
 * de marca o nada — nunca una foto aleatoria que promete un trabajo que
 * no es el tuyo.
 */
const CAPACIDADES = [
  { titulo: "Diseño web", desc: "Sitios corporativos que se sienten caros y funcionan perfecto en móvil.", arte: "browser", span: "md:col-span-2" },
  { titulo: "Identidad visual", desc: "Paleta, tipografía y la pieza que la gente recuerda.", arte: "marca", span: "" },
  { titulo: "Landing pages", desc: "Una página, un mensaje, un botón. Diseñada para convertir.", arte: "landing", span: "" },
  { titulo: "Optimización", desc: "Velocidad, SEO y accesibilidad desde el primer commit.", arte: "perf", span: "md:col-span-2" },
];

function ArteCapacidad({ tipo }: { tipo: string }) {
  if (tipo === "browser") {
    return (
      <div className="card-elevated grain flex aspect-[3/2] w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-border-hover" />
            <span className="h-2 w-2 rounded-full bg-border-hover" />
            <span className="h-2 w-2 rounded-full bg-accent/60" />
            <span className="ml-2 h-2 flex-1 rounded-full bg-border" />
          </div>
          <div className="space-y-2.5 p-4">
            <div className="h-3 w-2/3 rounded-full bg-ink/70" />
            <div className="h-2 w-full rounded-full bg-border" />
            <div className="h-2 w-5/6 rounded-full bg-border" />
            <div className="flex gap-2 pt-2">
              <span className="h-5 w-16 rounded-md bg-accent" />
              <span className="h-5 w-16 rounded-md border border-border" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (tipo === "marca") {
    return (
      <div className="card-elevated grain flex aspect-[3/2] w-full items-center justify-center gap-6 p-6">
        <span className="text-5xl font-bold tracking-tighter text-ink">Aa</span>
        <div className="flex flex-col gap-1.5">
          <span className="h-4 w-16 rounded-sm bg-accent" />
          <span className="h-4 w-16 rounded-sm bg-ink" />
          <span className="h-4 w-16 rounded-sm bg-muted" />
          <span className="h-4 w-16 rounded-sm border border-border bg-surface" />
        </div>
      </div>
    );
  }
  if (tipo === "landing") {
    return (
      <div className="card-elevated grain flex aspect-[3/2] w-full items-center justify-center p-6">
        <div className="w-36 space-y-2 rounded-lg border border-border bg-surface p-3 shadow-sm">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-accent" />
          <div className="mx-auto h-3 w-24 rounded-sm bg-ink/70" />
          <div className="mx-auto h-1.5 w-20 rounded-full bg-border" />
          <div className="mx-auto h-1.5 w-16 rounded-full bg-border" />
          <div className="mx-auto mt-2 h-4 w-12 rounded-md bg-accent" />
        </div>
      </div>
    );
  }
  return (
    <div className="card-elevated grain flex aspect-[3/2] w-full items-center justify-center gap-8 p-6 md:p-10">
      {[
        { k: "LCP", v: "0,9s" },
        { k: "SEO", v: "100" },
        { k: "A11y", v: "AA" },
      ].map((m) => (
        <div key={m.k} className="text-center">
          <p className="font-mono text-2xl font-bold text-ink">{m.v}</p>
          <p className="eyebrow mt-1 text-muted">{m.k}</p>
        </div>
      ))}
    </div>
  );
}

const PROCESO = [
  { n: "01", titulo: "Escuchamos", desc: "Tu negocio, tus clientes, tu meta." },
  { n: "02", titulo: "Diseñamos", desc: "Propuesta visual antes de escribir código." },
  { n: "03", titulo: "Programamos", desc: "Código limpio, rápido y accesible." },
  { n: "04", titulo: "Lanzamos", desc: "Y seguimos ahí cuando necesitas cambios." },
];

export default function DisenoPage() {
  return (
    <div className="space-y-0 pb-16">
      {/* ══════════════════════════════════════════════ */}
      {/* HERO: tipografía como protagonista                */}
      {/* ══════════════════════════════════════════════ */}
      <section className="grain relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-navy-hover px-8 py-20 text-center md:px-16 md:py-28 section-space-lg">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-blue-bright/10 blur-3xl"
        />

        <Reveal className="relative space-y-6">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-orange">
            Diseño web
          </p>
        </Reveal>

        <Reveal delay={100} className="relative">
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tighter text-white md:text-6xl">
            Tu marca merece más que{" "}
            <span className="italic text-orange">una plantilla.</span>
          </h1>
        </Reveal>

        <Reveal delay={200} className="relative">
          <p className="mx-auto max-w-[55ch] text-base leading-relaxed text-white/70">
            Diseñamos sitios que convierten visitas en clientes. Cada
            tipografía, color y sombra en esta página es deliberada: así se
            vería tu proyecto.
          </p>
        </Reveal>

        <Reveal delay={300} className="relative">
          <PillButton
            href="#hablemos"
            className="btn-accent min-h-11 px-8 py-3 text-base focus-ring"
            circleColor="#ffffff"
            hoverTextColor="#09090b"
          >
            Hablemos de tu proyecto
          </PillButton>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* MANIFIESTO: una sola idea, mucho silencio        */}
      {/* ══════════════════════════════════════════════ */}
      <section className="section-space-lg px-4 md:px-16">
        <Reveal>
          <h2 className="max-w-[60ch] text-3xl font-semibold leading-[1.15] tracking-tight text-ink md:text-4xl lg:text-5xl">
            El buen diseño no grita.{" "}
            <span className="text-muted">Conversa.</span>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-4 max-w-[55ch] text-lg leading-relaxed text-muted">
            Tu sitio es la primera impresión que un cliente tiene de tu
            empresa. Antes de que lean una palabra, ya decidieron si te toman
            en serio. Nosotros nos aseguramos de que la respuesta sea sí.
          </p>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* CAPACIDADES: bento con arte propio en CSS        */}
      {/* ══════════════════════════════════════════════ */}
      <section className="section-space-lg">
        <Reveal className="mb-12 flex items-center gap-4">
          <span className="eyebrow text-accent-text">01</span>
          <span aria-hidden className="h-px flex-1 bg-border" />
          <span className="eyebrow text-muted">Lo que hacemos</span>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {CAPACIDADES.map((cap, i) => (
            <Reveal key={cap.titulo} delay={i * 100} className={cap.span}>
              <article className="card-elevated group overflow-hidden">
                <div className="overflow-hidden">
                  <div className="transition duration-500 group-hover:scale-[1.02]">
                    <ArteCapacidad tipo={cap.arte} />
                  </div>
                </div>
                <div className="space-y-1.5 p-6">
                  <h3 className="text-lg font-semibold tracking-tight text-ink">
                    {cap.titulo}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted">
                    {cap.desc}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* PROCESO: línea horizontal, 4 pasos               */}
      {/* ══════════════════════════════════════════════ */}
      <section className="section-space-lg">
        <Reveal className="mb-12 flex items-center gap-4">
          <span className="eyebrow text-accent-text">02</span>
          <span aria-hidden className="h-px flex-1 bg-border" />
          <span className="eyebrow text-muted">Cómo trabajamos</span>
        </Reveal>
        <div className="relative">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-5 hidden h-px bg-border md:block"
          />
          <ol className="grid gap-6 md:grid-cols-4">
            {PROCESO.map((paso, i) => (
              <Reveal key={paso.n} delay={i * 100}>
                <li className="relative">
                  <div className="card-elevated p-6 h-full">
                    <span className="relative z-10 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface font-mono text-lg font-bold text-accent-text shadow-sm">
                      {paso.n}
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-ink">
                      {paso.titulo}
                    </h3>
                    <p className="mt-1 max-w-[38ch] text-sm leading-relaxed text-muted">
                      {paso.desc}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* CTA: cierre con punch                             */}
      {/* ══════════════════════════════════════════════ */}
      <section
        id="hablemos"
        className="grain relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-navy-hover px-8 py-16 text-center md:py-20 section-space-lg"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-orange/15 blur-3xl"
        />
        <Reveal className="relative space-y-4">
          <h2 className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-white md:text-3xl lg:text-4xl">
            Tu próximo sitio empieza con una conversación.
          </h2>
          <p className="mx-auto max-w-[50ch] text-base leading-relaxed text-white/60">
            Sin compromiso. Escuchamos lo que necesitas y te decimos
            honestamente si podemos ayudarte.
          </p>
          {SOPORTE_EMAIL ? (
            <PillButton
              href={`mailto:${SOPORTE_EMAIL}?subject=Proyecto de diseño web`}
              className="btn-accent min-h-11 px-8 py-3 text-base focus-ring"
              circleColor="#ffffff"
              hoverTextColor="#09090b"
            >
              Escríbenos a {SOPORTE_EMAIL}
            </PillButton>
          ) : (
            <PillButton
              href="/#contacto"
              className="btn-accent min-h-11 px-8 py-3 text-base focus-ring"
              circleColor="#ffffff"
              hoverTextColor="#09090b"
            >
              Contáctanos
            </PillButton>
          )}
        </Reveal>
      </section>

      {/* Volver al ERP */}
      <div className="text-center pt-8">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center text-sm text-muted underline underline-offset-4 transition-colors hover:text-accent-text focus-ring"
        >
          ← Conoce Yellow, el ERP de facturación electrónica
        </Link>
      </div>
    </div>
  );
}

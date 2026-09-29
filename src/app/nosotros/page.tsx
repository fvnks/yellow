import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { PillButton } from "@/components/pill-button";


export const metadata: Metadata = {
  title: "Nosotros",
  description: "Conoce al equipo detrÃ¡s de Yellow: facturaciÃ³n electrÃ³nica y diseÃ±o web para empresas chilenas.",
};

const EQUIPO = [
  { nombre: "Alejandro", rol: "Fundador & CEO", desc: "Experto en facturaciÃ³n electrÃ³nica SII y arquitectura de software.", avatar: "A" },
  { nombre: "Rodrigo", rol: "Fundador & CTO", desc: "DiseÃ±ador y desarrollador full-stack, obsesionado con la UX.", avatar: "R" },
];

const VALORES = [
  { titulo: "Simplicidad", desc: "Eliminamos la complejidad innecesaria. El software debe ser invisible." },
  { titulo: "Cumplimiento", desc: "Cada DTE sale perfecto. Cero observaciones del SII, cero dolores de cabeza." },
  { titulo: "DiseÃ±o honesto", desc: "No usamos plantillas. Cada pixel tiene intenciÃ³n y propÃ³sito." },
  { titulo: "CercanÃ­a", desc: "Respondemos en minutos, no en dÃ­as. Somos socios, no proveedores." },
];

export default function NosotrosPage() {
  return (
    <div className="space-y-0 pb-16">
      {/* HERO */}
      <section className="grain relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-navy-hover px-8 py-20 text-center md:px-16 md:py-28 section-space-lg">
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-blue-bright/10 blur-3xl" />

        <Reveal className="relative space-y-6">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-orange">Nosotros</p>

          <Reveal delay={100}>
            <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tighter text-white md:text-6xl lg:text-7xl">
              Software que factura. DiseÃ±o que convierte.
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="mx-auto max-w-[55ch] text-lg leading-relaxed text-white/70">
              Yellow nace de la frustraciÃ³n: facturar en Chile es complicado y la mayorÃ­a de sitios web se ven genÃ©ricos.
              Decidimos hacer las dos cosas bien: un ERP que habla con el SII sin dolor, y un estudio de diseÃ±o que no usa plantillas.
            </p>
          </Reveal>
        </Reveal>
      </section>

      {/* EQUIPO */}
      <section className="section-space-lg px-4 md:px-16">
        <Reveal className="mb-12 flex items-center gap-4">
          <span className="eyebrow text-accent-text">01</span>
          <span aria-hidden className="h-px flex-1 bg-border" />
          <span className="eyebrow text-muted">El equipo</span>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2">
          {EQUIPO.map((persona, i) => (
            <Reveal key={persona.nombre} delay={i * 120}>
              <article className="card-elevated p-8 flex gap-6">
                <div className="shrink-0 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 text-accent text-3xl font-bold">
                  {persona.avatar}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-ink">{persona.nombre}</h3>
                  <p className="text-sm text-accent-text mt-0.5">{persona.rol}</p>
                  <p className="mt-2 text-muted">{persona.desc}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* VALORES */}
      <section className="section-space-lg px-4 md:px-16">
        <Reveal className="mb-12 flex items-center gap-4">
          <span className="eyebrow text-accent-text">02</span>
          <span aria-hidden className="h-px flex-1 bg-border" />
          <span className="eyebrow text-muted">CÃ³mo trabajamos</span>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {VALORES.map((valor, i) => (
            <Reveal key={valor.titulo} delay={i * 100}>
              <article className="card-elevated p-6">
                <h3 className="text-lg font-semibold text-ink">{valor.titulo}</h3>
                <p className="mt-2 text-sm text-muted">{valor.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
      {/* HISTORIA */}
      <section className="section-space-lg px-4 md:px-16">
        <Reveal className="mb-12 flex items-center gap-4">
          <span className="eyebrow text-accent-text">03</span>
          <span aria-hidden className="h-px flex-1 bg-border" />
          <span className="eyebrow text-muted">Nuestra historia</span>
        </Reveal>

        <div className="max-w-3xl mx-auto space-y-6 text-center">
          <Reveal delay={100}>
            <p className="text-lg leading-relaxed text-muted">
              2023. Alejandro llevaba aÃ±os implementando facturaciÃ³n electrÃ³nica para pymes chilenas.
              Rodrigo diseÃ±aba sitios web para empresas que querÃ­an verse profesionales sin pagar agencias caras.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-lg leading-relaxed text-muted">
              Una conversación en un café de Providencia: &ldquo;¿Y si juntamos las dos cosas?&rdquo;.
              FacturaciÃ³n que funciona + diseÃ±o que convierte. Sin plantillas, sin certificados complejos al inicio, sin letras chicas.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <p className="text-lg leading-relaxed text-muted">
              Hoy Yellow es usado por empresas que emiten miles de DTE al mes y por marcas que necesitan sitios que venden.
              Seguimos siendo dos personas, pero el impacto escala.
            </p>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="section-space-lg px-4 md:px-16 text-center">
        <Reveal>
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Â¿QuerÃ©s trabajar con nosotros?
          </h2>
          <p className="mt-4 mx-auto max-w-[50ch] text-base leading-relaxed text-muted">
            Ya sea para facturar sin dolores de cabeza o para un sitio que convierta visitas en clientes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <PillButton
              href="/contacto"
              className="btn-primary min-h-11 px-8 py-3 text-base focus-ring"
            >
              Hablemos
            </PillButton>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center px-6 py-2.5 text-sm font-medium text-muted underline underline-offset-4 transition-colors hover:text-ink focus-ring rounded-full"
            >
              Volver al inicio
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}


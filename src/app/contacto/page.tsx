import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { PillButton } from "@/components/pill-button";
import { SOPORTE_EMAIL } from "@/lib/contacto";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contacto",
  description: "¿Tienes un proyecto en mente? Escríbenos y conversamos sin compromiso.",
};

export default function ContactoPage() {
  const mailtoHref = `mailto:${SOPORTE_EMAIL}?subject=Contacto%20desde%20web&body=Hola%20Yellow%2C%0A%0ATengo%20este%20proyecto%20en%20mente%3A%20%5Bdescr%C3%ADbelo%20aqu%C3%AD%5D`;

  return (
    <div className="space-y-0 pb-16">
      {/* HERO */}
      <section className="grain relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-navy-hover px-8 py-20 text-center md:px-16 md:py-28 section-space-lg">
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-blue-bright/10 blur-3xl" />

        <Reveal className="relative space-y-6">
          <div className="absolute left-0 top-0">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-white/80 hover:text-white transition-colors focus-ring"
              aria-label="Volver al inicio"
            >
              ← Inicio
            </Link>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-orange">Contacto</p>

          <Reveal delay={100}>
            <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tighter text-white md:text-6xl lg:text-7xl">
              Hablemos de tu proyecto
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="mx-auto max-w-[55ch] text-lg leading-relaxed text-white/70">
              Sin formularios eternos. Un correo, una llamada o un café. Tú eliges cómo empezamos.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <PillButton
              href={mailtoHref}
              className="btn-accent min-h-11 px-8 py-3 text-base focus-ring"
              circleColor="#ffffff"
              hoverTextColor="#09090b"
            >
              Escríbenos a {SOPORTE_EMAIL}
            </PillButton>
          </Reveal>
        </Reveal>
      </section>

      {/* FORMAS DE CONTACTO */}
      <section className="section-space-lg px-4 md:px-16">
        <Reveal className="mb-12 flex items-center gap-4">
          <span className="eyebrow text-accent-text">01</span>
          <span aria-hidden className="h-px flex-1 bg-border" />
          <span className="eyebrow text-muted">Cómo contactarnos</span>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Email */}
          <Reveal delay={100}>
            <article className="card-elevated p-8 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent mb-5">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-ink">Correo directo</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                La forma más rápida. Respondemos en menos de 24h laborables.
              </p>
              <a
                href={mailtoHref}
                className="mt-5 inline-flex items-center justify-center gap-2 text-sm font-medium text-accent-text hover:text-accent-display transition-colors focus-ring rounded-full px-4 py-2"
              >
                Abrir correo →
              </a>
            </article>
          </Reveal>

          {/* WhatsApp */}
          <Reveal delay={200}>
            <article className="card-elevated p-8 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-green/10 text-green mb-5">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-ink">WhatsApp / Llamada</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                ¿Prefieres voz? Escríbenos por WhatsApp o agenda una llamada corta.
              </p>
              <a
                href="https://wa.me/56912345678?text=Hola%20Yellow%2C%20quiero%20informaci%C3%B3n%20sobre%20sus%20servicios"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center justify-center gap-2 text-sm font-medium text-green hover:text-green-dark transition-colors focus-ring rounded-full px-4 py-2"
              >
                Abrir WhatsApp →
              </a>
            </article>
          </Reveal>

          {/* Calendly */}
          <Reveal delay={300}>
            <article className="card-elevated p-8 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue/10 text-blue mb-5">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-ink">Agenda 20 min</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Reserva una videollamada sin compromiso. Eliges día y hora.
              </p>
              <a
                href="https://calendly.com/yellow-erp/20min"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center justify-center gap-2 text-sm font-medium text-blue hover:text-blue-dark transition-colors focus-ring rounded-full px-4 py-2"
              >
                Ver disponibilidad →
              </a>
            </article>
          </Reveal>
        </div>
      </section>

      {/* FORMULARIO DE CONTACTO */}
      <section className="section-space px-4 md:px-16">
        <Reveal className="mb-12 flex items-center gap-4">
          <span className="eyebrow text-accent-text">02</span>
          <span aria-hidden className="h-px flex-1 bg-border" />
          <span className="eyebrow text-muted">Escríbenos directo</span>
        </Reveal>
        <div className="max-w-xl mx-auto">
          <ContactForm />
        </div>
      </section>

      {/* QUÉ ESPERAR */}
      <section className="section-space-lg px-4 md:px-16">
        <Reveal className="mb-12 flex items-center gap-4">
          <span className="eyebrow text-accent-text">03</span>
          <span aria-hidden className="h-px flex-1 bg-border" />
          <span className="eyebrow text-muted">Qué pasa después</span>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            { n: "01", titulo: "Recibimos tu mensaje", desc: "Te confirmamos recepción en minutos y asignamos a la persona indicada." },
            { n: "02", titulo: "Conversación breve", desc: "15-20 min para entender tu contexto, objetivos y restricciones." },
            { n: "03", titulo: "Propuesta concreta", desc: "Te enviamos alcance, tiempos y presupuesto. Sin letra chica." },
          ].map((paso, i) => (
            <Reveal key={paso.n} delay={i * 100}>
              <article className="card-elevated p-6">
                <div className="flex items-start gap-4">
                  <span className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface font-mono text-lg font-bold text-accent-text">
                    {paso.n}
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink">{paso.titulo}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{paso.desc}</p>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="section-space-lg px-4 md:px-16 text-center">
        <Reveal>
          <p className="text-sm text-muted mb-4">¿Aún no sabes por dónde empezar?</p>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-muted underline underline-offset-4 transition-colors hover:text-accent-text focus-ring"
          >
            ← Conoce Yellow, el ERP de facturación electrónica
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
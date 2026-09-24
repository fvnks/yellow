import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { SOPORTE_EMAIL } from "@/lib/contacto";
export const metadata: Metadata = {
  title: "Diseño web",
  description:
    "Diseñamos sitios que convierten visitas en clientes. Tipografía, color y detalle con intención.",
};

const CAPACIDADES = [
  {
    titulo: "Diseño web",
    desc: "Sitios corporativos que se sienten caros y funcionan perfecto en móvil.",
    img: "https://picsum.photos/seed/yellow-web-design/600/400",
    span: "md:col-span-2",
  },
  {
    titulo: "Identidad visual",
    desc: "Paleta, tipografía y la pieza que la gente recuerda.",
    img: "https://picsum.photos/seed/yellow-brand-identity/600/400",
    span: "",
  },
  {
    titulo: "Landing pages",
    desc: "Una página, un mensaje, un botón. Diseñada para convertir.",
    img: "https://picsum.photos/seed/yellow-landing/600/400",
    span: "",
  },
  {
    titulo: "Optimización",
    desc: "Velocidad, SEO y accesibilidad desde el primer commit.",
    img: "https://picsum.photos/seed/yellow-performance/600/400",
    span: "md:col-span-2",
  },
];

const PROCESO = [
  { n: "01", titulo: "Escuchamos", desc: "Tu negocio, tus clientes, tu meta." },
  { n: "02", titulo: "Diseñamos", desc: "Propuesta visual antes de escribir código." },
  { n: "03", titulo: "Programamos", desc: "Código limpio, rápido y accesible." },
  { n: "04", titulo: "Lanzamos", desc: "Y seguimos ahí cuando necesitas cambios." },
];

export default function DisenoPage() {
  return (
    <div className="space-y-20 pb-16">
      {/* ══════════════════════════════════════════════ */}
      {/* HERO: tipografía como protagonista                */}
      {/* ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-md bg-gradient-to-br from-navy to-navy-hover px-8 py-20 text-center md:px-16 md:py-28">
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
          <a
            href="#hablemos"
            className="btn bg-white px-6 py-2.5 text-base text-navy transition-colors hover:bg-orange hover:text-white active:translate-y-px"
          >
            Hablemos de tu proyecto
          </a>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* MANIFIESTO: una sola idea, mucho silencio        */}
      {/* ══════════════════════════════════════════════ */}
      <section className="space-y-6 px-4 md:px-16">
        <Reveal>
          <h2 className="max-w-[60ch] text-3xl font-semibold leading-[1.15] tracking-tight text-ink md:text-4xl">
            El buen diseño no grita.{" "}
            <span className="text-ink-soft">Conversa.</span>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="max-w-[55ch] text-base leading-relaxed text-ink-soft">
            Tu sitio es la primera impresión que un cliente tiene de tu
            empresa. Antes de que lean una palabra, ya decidieron si te toman
            en serio. Nosotros nos aseguramos de que la respuesta sea sí.
          </p>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* CAPACIDADES: bento con fotografía real           */}
      {/* ══════════════════════════════════════════════ */}
      <section className="space-y-8">
        <Reveal>
          <h2 className="text-lg font-medium text-ink">Lo que hacemos</h2>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {CAPACIDADES.map((cap, i) => (
            <Reveal key={cap.titulo} delay={i * 100} className={cap.span}>
              <article className="group overflow-hidden rounded-md border border-line bg-panel shadow-sm shadow-navy/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-navy/10">
                <div className="overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cap.img}
                    alt={cap.titulo}
                    width={600}
                    height={400}
                    className="aspect-[3/2] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    loading={i < 2 ? "eager" : "lazy"}
                  />
                </div>
                <div className="space-y-1.5 p-5">
                  <h3 className="text-base font-semibold text-ink">
                    {cap.titulo}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-soft">
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
      <section className="space-y-8">
        <Reveal>
          <h2 className="text-lg font-medium text-ink">Cómo trabajamos</h2>
        </Reveal>
        <div className="relative">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-5 hidden h-px bg-line md:block"
          />
          <ol className="grid gap-6 md:grid-cols-4">
            {PROCESO.map((paso, i) => (
              <Reveal key={paso.n} delay={i * 100}>
                <li className="relative space-y-2">
                  <span className="relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-md bg-navy font-mono text-sm font-semibold text-white">
                    {paso.n}
                  </span>
                  <h3 className="text-sm font-semibold text-ink">
                    {paso.titulo}
                  </h3>
                  <p className="text-xs leading-relaxed text-ink-soft">
                    {paso.desc}
                  </p>
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
        className="relative overflow-hidden rounded-md bg-gradient-to-br from-navy to-navy-hover px-8 py-16 text-center md:py-20"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-orange/15 blur-3xl"
        />
        <Reveal className="relative space-y-4">
          <h2 className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Tu próximo sitio empieza con una conversación.
          </h2>
          <p className="mx-auto max-w-[50ch] text-sm leading-relaxed text-white/60">
            Sin compromiso. Escuchamos lo que necesitas y te decimos
            honestamente si podemos ayudarte.
          </p>
          {SOPORTE_EMAIL ? (
            <a
              href={`mailto:${SOPORTE_EMAIL}?subject=Proyecto de diseño web`}
              className="btn bg-white px-6 py-2.5 text-base text-navy transition-colors hover:bg-orange hover:text-white active:translate-y-px"
            >
              Escríbenos a {SOPORTE_EMAIL}
            </a>
          ) : (
            <Link
              href="/#contacto"
              className="btn bg-white px-6 py-2.5 text-base text-navy transition-colors hover:bg-orange hover:text-white active:translate-y-px"
            >
              Contáctanos
            </Link>
          )}
        </Reveal>
      </section>

      {/* Volver al ERP */}
      <div className="text-center">
        <Link
          href="/"
          className="text-sm text-ink-soft underline hover:text-orange-ink"
        >
          ← Conoce Yellow, el ERP de facturación electrónica
        </Link>
      </div>
    </div>
  );
}

import { PillButton } from "@/components/pill-button";
import { Reveal } from "@/components/reveal";
import { LANDING_DE } from "@/lib/oferta";

/**
 * Selector de aterrizaje: las dos puertas explícitas de Yellow.
 *
 * Va abajo, después de la historia del producto, porque su trabajo no es
 * convencer a quien ya sabe lo que quiere: es recoger a quien llegó buscando
 * lo otro y evitar que aterrice en el registro de algo que no pidió.
 */
const PUERTAS = [
  {
    id: "erp",
    eyebrow: "Producto",
    titulo: "Facturación electrónica",
    desc: "Facturas, guías y notas firmadas ante el SII, más compras, gastos, cotizaciones y libros. En modo simulado desde el minuto uno, sin .p12.",
    puntos: [
      "Emisión y anulación con TED",
      "Libro de compras y ventas",
      "Reportes y centros de costo",
    ],
    cta: { label: "Ver cómo funciona", href: LANDING_DE.erp },
    destacada: false,
  },
  {
    id: "diseno",
    eyebrow: "Estudio",
    titulo: "Diseño web e identidad",
    desc: "Sitios, landings e identidad visual para negocios que necesitan verse tan bien como funcionan. Una conversación primero.",
    puntos: ["Diseño web a medida", "Identidad visual", "Landings que convierten"],
    cta: { label: "Ver el estudio", href: LANDING_DE.diseno },
    destacada: true,
  },
];

export function LandingSelector() {
  return (
    <section id="oferta" className="border-t border-border section-space-lg">
      <div className="mb-12 flex items-center gap-4">
        <span className="eyebrow text-accent-text">03</span>
        <span aria-hidden className="h-px flex-1 bg-border" />
        <span className="eyebrow text-muted">Elegir puerta</span>
      </div>
      <div className="mb-12 grid max-w-4xl gap-x-10 gap-y-3 md:grid-cols-12">
        <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-ink md:col-span-7 md:text-4xl">
          Un producto y un estudio
        </h2>
        <p className="text-base leading-relaxed text-muted md:col-span-5 md:pt-1.5">
          Yellow hace software de facturación electrónica y, aparte, diseño
          web. Elige por dónde entrar.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {PUERTAS.map((puerta, i) => (
          <Reveal key={puerta.id} delay={i * 140}>
            <article
              id={`oferta-${puerta.id}`}
              className={`card-elevated group flex h-full flex-col p-6 md:p-8 ${
                puerta.destacada
                  ? "border-accent/30 bg-accent/5"
                  : "border-border bg-surface"
              }`}
            >
              <p className="eyebrow text-accent-text">
                {puerta.eyebrow}
              </p>
              <h3 className="mt-3 text-xl font-bold tracking-tight text-ink md:text-2xl">
                {puerta.titulo}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {puerta.desc}
              </p>
              <ul className="mt-5 space-y-2">
                {puerta.puntos.map((punto) => (
                  <li key={punto} className="flex items-center gap-2 text-sm text-ink">
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {punto}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                {puerta.destacada ? (
                  <PillButton
                    href={puerta.cta.href}
                    className="btn-accent min-h-11 px-6 py-2.5 focus-ring"
                    circleColor="#ffffff"
                    hoverTextColor="#09090b"
                  >
                    {puerta.cta.label}
                  </PillButton>
                ) : (
                  <PillButton href={puerta.cta.href} className="btn-primary min-h-11 px-6 py-2.5 focus-ring">
                    {puerta.cta.label}
                  </PillButton>
                )}
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

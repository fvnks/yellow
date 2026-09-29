import { FeaturesCarousel } from "@/components/features-carousel";
import { Reveal } from "@/components/reveal";

const PASOS = [
  { n: "1", titulo: "Crea tu cuenta", desc: "Tu empresa, tu equipo, aislados por espacio de trabajo." },
  { n: "2", titulo: "Sube tu certificado", desc: "O parte en modo simulado, sin .p12." },
  { n: "3", titulo: "Emite y registra", desc: "El XML y el PDF de cada documento, en su fila." },
];

/**
 * Cabecera editorial de sección.
 * Hairline con índice y label en mono (ritmo de revista), título a 7 columnas
 * y bajada a 5: la asimetría rompe el centrado uniforme de las secciones y
 * le da a cada bloque un momento propio antes del contenido.
 */
export function SectionHeading({
  indice,
  label,
  titulo,
  desc,
  className = "",
}: {
  indice: string;
  label: string;
  titulo: React.ReactNode;
  desc: React.ReactNode;
  className?: string;
}) {
  return (
    <Reveal className={`mb-12 ${className}`}>
      <div className="flex items-center gap-4">
        <span className="eyebrow text-accent-text">{indice}</span>
        <span aria-hidden className="h-px flex-1 bg-border" />
        <span className="eyebrow text-muted">{label}</span>
      </div>
      <div className="mt-6 grid gap-x-10 gap-y-3 md:grid-cols-12">
        <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-ink md:col-span-7 md:text-4xl">
          {titulo}
        </h2>
        <p className="text-base leading-relaxed text-muted md:col-span-5 md:pt-1.5">
          {desc}
        </p>
      </div>
    </Reveal>
  );
}

/**
 * Las dos secciones del producto: funciones y primeros pasos.
 *
 * Solo se renderizan en la oferta ERP. Si alguien eligió "Diseño web" en el
 * selector del hero y encuentra "Un ERP que hace el trabajo" justo debajo, el
 * selector mintió: cada oferta se queda con su propio relato.
 */
export function LandingErpSecciones() {
  return (
    <>
      <section id="funciones" className="border-t border-border section-space-lg">
        <SectionHeading
          indice="01"
          label="Funciones"
          titulo="Un ERP que hace el trabajo"
          desc="Emisión, compras, gastos, cotizaciones, libros y reportes. Todo en un producto, con el XML y el PDF de cada documento en su fila."
        />
        <FeaturesCarousel />
      </section>

      <section id="como-empezas" className="border-t border-border section-space-lg">
        <SectionHeading
          indice="02"
          label="Primeros pasos"
          titulo="Cómo empiezas"
          desc="Tres pasos hasta el primer documento firmado. Sin instalar nada y sin tarjeta."
        />
        <div className="relative">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-7 hidden h-px bg-border md:block"
          />
          <ol className="grid gap-6 md:grid-cols-3 md:gap-8">
            {PASOS.map((paso, i) => (
              <Reveal key={paso.n} delay={i * 120}>
                <li className="relative">
                  <div className="card-elevated p-6 h-full">
                    <span className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface font-mono text-xl font-bold text-accent-text shadow-sm">
                      {paso.n}
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-ink">
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
    </>
  );
}

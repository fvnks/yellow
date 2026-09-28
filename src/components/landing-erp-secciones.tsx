import { LandingFeatures } from "@/components/landing-features";

const PASOS = [
  { n: "1", titulo: "Crea tu cuenta", desc: "Tu empresa, tu equipo, aislados por espacio de trabajo." },
  { n: "2", titulo: "Sube tu certificado", desc: "O parte en modo simulado, sin .p12." },
  { n: "3", titulo: "Emite y registra", desc: "El XML y el PDF de cada documento, en su fila." },
];

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
      <section id="funciones" className="border-t border-border py-20 md:py-28">
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
            {PASOS.map((paso) => (
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
    </>
  );
}

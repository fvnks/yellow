import Link from "next/link";
import { getAuthContext } from "@/lib/session";
import { SOPORTE_EMAIL } from "@/lib/contacto";
import { LandingHero } from "@/components/landing-hero";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "Emisión y anulación",
    desc: "Facturas, guías y notas firmadas con TED. Folios desde tu propio CAF, consulta de estado ante el SII y anulación con nota de crédito automática.",
  },
  {
    title: "Compras y gastos",
    desc: "Registra facturas de proveedores, gastos de caja menor con reembolso, y clasifica por área y categoría. El desglose aparece solo en Reportes.",
  },
  {
    title: "Cotizaciones",
    desc: "Propuestas con correlativo propio que se convierten en factura con un clic. Receptor, ítems y dimensiones se repiten sin re-escribir nada.",
  },
  {
    title: "Libros y registro CSV",
    desc: "Libro de compras y ventas por período. El XML oficial listo para el SII y el registro CSV del portal cuando subas tus credenciales.",
  },
];

export default async function Home() {
  const ctx = await getAuthContext();

  return (
    <div className="pb-24">
      {/* ═══ HERO: tipografía masiva + grid pattern + preview de la app ═══ */}
      <LandingHero isAuthed={!!ctx} />

      {/* ═══ FEATURES: editorial, numerado, sin tarjetas ═══ */}
      <section id="funciones" className="border-t border-border py-20 md:py-32">
        <div className="mb-16 max-w-2xl md:mb-20">
          <h2 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Un ERP que hace el trabajo
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted md:text-lg">
            Emisión, compras, gastos, cotizaciones, libros y reportes. Todo en
            un producto, con el XML y el PDF de cada documento en su fila.
          </p>
        </div>

        <div className="grid gap-x-12 gap-y-16 md:grid-cols-2 md:gap-y-20">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="group">
              <span className="font-mono text-sm font-semibold text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-ink transition-colors group-hover:text-accent-text">
                <a href="#funciones" className="cursor-default">
                  {f.title}
                </a>
              </h3>
              <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-muted">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CÓMO EMPIEZAS: minimal, 3 pasos en línea ═══ */}
      <section
        id="como-empezas"
        className="border-t border-border py-20 md:py-28"
      >
        <div className="mb-14">
          <h2 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
            Cómo empiezas
          </h2>
        </div>
        <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
          {[
            {
              n: "01",
              titulo: "Crea tu cuenta",
              desc: "Tu empresa, tu equipo, aislados por espacio de trabajo.",
            },
            {
              n: "02",
              titulo: "Sube tu certificado",
              desc: "O parte en modo simulado, sin .p12.",
            },
            {
              n: "03",
              titulo: "Emite y registra",
              desc: "El XML y el PDF de cada documento, en su fila.",
            },
          ].map((paso) => (
            <li key={paso.n} className="relative">
              <span className="font-mono text-4xl font-bold tracking-tight text-border md:text-5xl">
                {paso.n}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-ink">
                {paso.titulo}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {paso.desc}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ═══ CTA: ultra-minimal, sin fondo de color ═══ */}
      <section
        id="contacto"
        className="border-t border-border py-20 text-center md:py-32"
      >
        <h2 className="mx-auto max-w-xl text-3xl font-bold tracking-tight text-ink md:text-4xl">
          Empieza hoy, sin certificado
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted">
          Yellow funciona en modo simulado desde el primer minuto. Sube tu
          .p12 cuando estés listo y las mismas pantallas hablan con el SII
          real.
        </p>
        <div className="mt-8">
          {ctx ? (
            <Link
              href="/dashboard"
              className="btn btn-primary px-8 py-3.5 text-base"
            >
              Ir al panel
            </Link>
          ) : (
            <Link
              href="/register"
              className="btn btn-primary px-8 py-3.5 text-base"
            >
              Crear cuenta
            </Link>
          )}
        </div>
        <p className="mt-6 text-sm text-faint">
          {SOPORTE_EMAIL ? (
            <>
              ¿Dudas?{" "}
              <a
                href={`mailto:${SOPORTE_EMAIL}`}
                className="text-muted underline underline-offset-4 hover:text-ink"
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
            className="text-muted underline underline-offset-4 hover:text-ink"
          >
            ¿Necesitas diseño web?
          </Link>
        </p>
      </section>
    </div>
  );
}

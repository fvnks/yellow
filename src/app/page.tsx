import Link from "next/link";
import { getAuthContext } from "@/lib/session";
import { SOPORTE_EMAIL } from "@/lib/contacto";

export const dynamic = "force-dynamic";

/**
 * Preview real del producto para el hero: mismas clases que la lista de
 * ventas (.panel/.tbl/.chip) con montos de ejemplo con IVA que cierra
 * exacto (100.000 + 19% = 119.000). No es un screenshot falso.
 */
const FILAS_PREVIEW = [
  {
    doc: "Factura 33 · 1000",
    parte: "Cliente SpA",
    total: "$119.000",
    estado: "ACEPTADO",
    chip: "chip chip-ok",
  },
  {
    doc: "Guía 52 · 3",
    parte: "Cliente SpA",
    total: "$47.600",
    estado: "ENVIADO",
    chip: "chip chip-orange",
  },
  {
    doc: "Factura 33 · 1001",
    parte: "Cliente SpA",
    total: "$95.200",
    estado: "ANULADO",
    chip: "chip chip-muted",
  },
];

const PASOS = [
  {
    n: "01",
    titulo: "Crea tu cuenta y tu espacio de trabajo",
    detalle:
      "Tu empresa, tu equipo y tus documentos quedan aislados por espacio de trabajo, con roles de administrador y miembro.",
  },
  {
    n: "02",
    titulo: "Sube tu certificado .p12 del SII",
    detalle:
      "O parte en modo simulado: emites y registras con el adaptador simulado mientras preparas tus credenciales y tus CAF.",
  },
  {
    n: "03",
    titulo: "Emite, registra y descarga",
    detalle:
      "Facturas con folio propio, compras clasificadas por área y categoría, y el XML y el PDF de cada documento en su fila.",
  },
];

export default async function Home() {
  const ctx = await getAuthContext();

  return (
    <div className="relative space-y-20 overflow-hidden pb-12 md:space-y-28">
      {/* Lavado de fondo: dos manchas suaves de marca, sin ruido */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-bright/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-orange/10 blur-3xl"
      />

      {/* Menú de secciones sobre el hero */}
      <nav
        aria-label="Secciones de la página"
        className="hidden items-center gap-6 pt-2 text-sm md:flex"
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

      {/* ── Hero: propuesta a la izquierda, producto en capas a la derecha ── */}
      <section className="relative grid items-center gap-10 pt-6 lg:grid-cols-[7fr_5fr] lg:gap-12 lg:pt-10">
        <div className="space-y-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue">
            Facturación electrónica ante el SII
          </p>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight text-ink md:text-5xl">
            Todo el ciclo de tus DTE,{" "}
            <span className="text-orange-ink">en un solo lugar</span>
          </h1>
          <p className="max-w-[65ch] text-base leading-relaxed text-ink-soft">
            Emite facturas al SII, registra tus compras por área y categoría, y
            descarga tus libros. Del borrador al TED.
          </p>
          <div className="flex flex-wrap gap-3">
            {ctx ? (
              <Link
                href="/dashboard"
                className="btn btn-primary px-5 py-2.5 text-base active:translate-y-px"
              >
                Ir al panel
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="btn btn-primary px-5 py-2.5 text-base active:translate-y-px"
                >
                  Crear cuenta
                </Link>
                <Link
                  href="/login"
                  className="btn btn-ghost px-5 py-2.5 text-base active:translate-y-px"
                >
                  Ingresar
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 translate-x-3 translate-y-3 rounded-md bg-navy/10"
          />
          <div className="panel relative overflow-hidden shadow-xl shadow-navy/20">
            <div className="flex items-center justify-between border-b border-line bg-block px-4 py-2.5">
              <span className="text-xs font-medium text-ink-soft">
                Ventas · septiembre 2026
              </span>
              <span className="text-xs text-ink-soft">XML · PDF por fila</span>
            </div>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th scope="col">Documento</th>
                    <th scope="col">Receptor</th>
                    <th scope="col" className="text-right">Total</th>
                    <th scope="col" className="text-right">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {FILAS_PREVIEW.map((f) => (
                    <tr key={f.doc}>
                      <td className="whitespace-nowrap font-medium">{f.doc}</td>
                      <td>{f.parte}</td>
                      <td className="text-right">{f.total}</td>
                      <td className="text-right">
                        <span className={f.chip}>{f.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── Módulos: bento asimétrico, capas y sombras tintadas ── */}
      <section id="funciones" className="relative space-y-8">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Cuatro módulos que se hablan entre sí
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <article className="panel space-y-3 p-6 shadow-sm shadow-navy/10 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-navy/15 md:col-span-2">
            <h3 className="text-lg font-semibold text-ink">
              Emisión y anulación
            </h3>
            <p className="max-w-[65ch] text-sm leading-relaxed text-ink-soft">
              Facturas, guías y notas firmadas con TED, con tus CAF y folios
              propios. Consultas el estado ante el SII y anulas con una nota de
              crédito automática.
            </p>
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
              <span className="chip chip-blue">FIRMADO</span> →
              <span className="chip chip-orange">ENVIADO</span> →
              <span className="chip chip-ok">ACEPTADO</span>
            </p>
          </article>

          <article className="space-y-3 rounded-md bg-gradient-to-br from-block to-panel p-6 shadow-sm shadow-navy/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-navy/10">
            <h3 className="text-lg font-semibold text-ink">
              Compras clasificadas
            </h3>
            <p className="text-sm leading-relaxed text-ink-soft">
              Registra cada factura recibida con su proveedor y folio, y
              clasifícala por área y categoría en dos clics.
            </p>
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
              <span className="chip chip-muted">ADM</span>
              <span className="chip chip-blue">Insumos</span>
              <span className="font-medium text-ink">$95.200</span>
            </p>
          </article>

          <article className="panel space-y-3 p-6 shadow-sm shadow-navy/10 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-navy/15">
            <h3 className="text-lg font-semibold text-ink">
              Libros y registro CSV
            </h3>
            <p className="text-sm leading-relaxed text-ink-soft">
              Libro de compras y ventas en línea, con el registro CSV del
              portal del SII cuando subas tus credenciales tributarias.
            </p>
          </article>

          <article className="space-y-4 rounded-md bg-gradient-to-br from-block to-panel p-6 shadow-sm shadow-navy/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-navy/10 md:col-span-2">
            <h3 className="text-lg font-semibold text-ink">
              Multi-empresa, con roles
            </h3>
            <p className="max-w-[65ch] text-sm leading-relaxed text-ink-soft">
              Varias empresas en una sola cuenta. Invita a tu equipo como
              administrador o miembro; cada documento queda asociado a su
              vendedor y centro de costo.
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

      {/* ── Cómo empiezas: lista numerada, sin tarjetas ── */}
      <section id="como-empezas" className="relative space-y-8">
        <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Cómo empiezas
        </h2>
        <ol className="divide-y divide-line">
          {PASOS.map((paso) => (
            <li
              key={paso.n}
              className="grid items-start gap-3 py-6 md:grid-cols-[7rem_1fr] md:gap-8"
            >
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

      {/* ── Banda navy: la promesa honesta, contacto y CTA ── */}
      <section
        id="contacto"
        className="relative overflow-hidden rounded-md bg-gradient-to-br from-navy to-navy-hover p-8 md:p-12"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-orange/15 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-8">
          <div className="flex max-w-2xl items-start gap-4">
            <span aria-hidden className="mt-1.5 h-3.5 w-3.5 shrink-0 bg-orange" />
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Parte en modo simulado, pasa a producción cuando estés listo
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/80">
                Sin certificado, Yellow funciona con el adaptador simulado del
                SII. Sube tu .p12 y las mismas pantallas hablan con el SII
                real, sin migrar nada.
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
        <p className="relative mt-8 text-xs text-white/70">
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
            <>
              ¿Dudas? Crea tu cuenta y pruébalo en modo simulado, sin
              certificado; el canal de contacto directo llega pronto.
            </>
          )}
        </p>
      </section>
    </div>
  );
}

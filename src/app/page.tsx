import Link from "next/link";
import { getAuthContext } from "@/lib/session";
import { SOPORTE_EMAIL } from "@/lib/contacto";

export const dynamic = "force-dynamic";

/**
 * Preview real del producto para el hero del ERP.
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

const PRINCIPIOS = [
  {
    n: "01",
    titulo: "Jerarquía",
    desc: "El tamaño, el peso y el color guían el ojo sin forzarlo.",
    demo: (
      <span className="flex items-baseline gap-2">
        <span className="text-[10px] font-medium text-white/50">Aa</span>
        <span className="text-sm font-medium text-white/70">Aa</span>
        <span className="text-xl font-semibold text-white">Aa</span>
        <span className="text-3xl font-bold tracking-tight text-orange">Aa</span>
      </span>
    ),
  },
  {
    n: "02",
    titulo: "Color que comunica",
    desc: "Cada tono tiene un porqué: contrastes medidos, no adivinados.",
    demo: (
      <span className="flex gap-2">
        <span className="h-6 w-6 rounded-sm bg-navy ring-1 ring-white/20" />
        <span className="h-6 w-6 rounded-sm bg-orange" />
        <span className="h-6 w-6 rounded-sm bg-white/90" />
        <span className="h-6 w-6 rounded-sm bg-[#f4f6f8] ring-1 ring-white/20" />
      </span>
    ),
  },
  {
    n: "03",
    titulo: "Espacio que respira",
    desc: "El silencio entre elementos es tan importante como el contenido.",
    demo: (
      <span className="flex h-10 w-16 items-center justify-center">
        <span className="h-2 w-2 rounded-full bg-orange" />
      </span>
    ),
  },
  {
    n: "04",
    titulo: "Detalle que se siente",
    desc: "Sombras tintadas, radios consistentes, hover con física.",
    demo: (
      <span className="rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition hover:bg-white/15">
        Hover sobre mí
      </span>
    ),
  },
];

const PROCESO = [
  { n: "01", titulo: "Escuchamos", desc: "Tu negocio, tus clientes, tus metas." },
  { n: "02", titulo: "Diseñamos", desc: "Propuesta visual antes de escribir código." },
  { n: "03", titulo: "Programamos", desc: "Código limpio, rápido y accesible." },
  { n: "04", titulo: "Lanzamos", desc: "Y seguimos ahí cuando necesitas cambios." },
];

export default async function Home() {
  const ctx = await getAuthContext();

  return (
    <div className="relative space-y-24 overflow-hidden pb-16">
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
        className="hidden items-center gap-6 pt-2 text-sm md:flex"
      >
        <a href="#erp" className="text-blue hover:text-orange-ink">
          El ERP
        </a>
        <a href="#diseno" className="text-blue hover:text-orange-ink">
          Diseño web
        </a>
        <a href="#contacto" className="text-blue hover:text-orange-ink">
          Contacto
        </a>
      </nav>

      {/* ══════════════════════════════════════════════ */}
      {/* HERO: dos caminos, un estándar                    */}
      {/* ══════════════════════════════════════════════ */}
      <section className="grid items-center gap-10 pt-6 lg:grid-cols-[7fr_5fr] lg:gap-12 lg:pt-10">
        <div className="space-y-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue">
            Facturación electrónica · Diseño web
          </p>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight text-ink md:text-5xl">
            Software que factura.{" "}
            <span className="text-orange-ink">Diseño que convierte.</span>
          </h1>
          <p className="max-w-[65ch] text-base leading-relaxed text-ink-soft">
            Yellow emite tus DTE ante el SII y diseña la web que tu empresa
            merece. Un solo estándar: que se note que hay expertos detrás.
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
              <Link
                href="/register"
                className="btn btn-primary px-5 py-2.5 text-base active:translate-y-px"
              >
                Crear cuenta
              </Link>
            )}
            <a
              href="#diseno"
              className="btn btn-ghost px-5 py-2.5 text-base active:translate-y-px"
            >
              Ver diseño web
            </a>
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

      {/* ══════════════════════════════════════════════ */}
      {/* SECCIÓN 1: EL ERP (clara, institucional)        */}
      {/* ══════════════════════════════════════════════ */}
      <section id="erp" className="relative space-y-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            El ERP que factura por ti
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Emisión, compras, gastos, cotizaciones, libros y reportes. Todo el
            ciclo del DTE en un solo lugar, con descarga de XML y PDF por
            documento.
          </p>
        </div>

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
              Compras y gastos
            </h3>
            <p className="text-sm leading-relaxed text-ink-soft">
              Registra facturas de proveedores, gastos de caja menor con
              reembolso, y clasifícalo por área y categoría en dos clics.
            </p>
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
              <span className="chip chip-muted">ADM</span>
              <span className="chip chip-blue">Insumos</span>
              <span className="font-medium text-ink">$95.200</span>
            </p>
          </article>

          <article className="panel space-y-3 p-6 shadow-sm shadow-navy/10 transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-navy/15">
            <h3 className="text-lg font-semibold text-ink">
              Cotizaciones
            </h3>
            <p className="text-sm leading-relaxed text-ink-soft">
              Propuestas de venta con correlativo propio que se convierten en
              factura con un clic, sin re-escribir nada.
            </p>
            <p className="flex items-center gap-1.5 text-xs text-ink-soft">
              <span className="chip chip-muted">COT-0042</span>
              <span className="chip chip-ok">ACEPTADA</span>
              <span className="font-medium text-blue">→ Venta</span>
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

      {/* Transición deliberada: la línea naranja */}
      <div aria-hidden className="h-1 w-full rounded-full bg-orange" />

      {/* ══════════════════════════════════════════════ */}
      {/* SECCIÓN 2: DISEÑO WEB (oscura, demostrativa)   */}
      {/* ══════════════════════════════════════════════ */}
      <section
        id="diseno"
        className="relative overflow-hidden rounded-md bg-gradient-to-br from-navy to-navy-hover p-8 md:p-14"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-orange/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 bottom-0 h-72 w-72 rounded-full bg-blue-bright/10 blur-3xl"
        />

        <div className="relative space-y-16">
          {/* Tipografía como protagonista */}
          <div className="max-w-3xl space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange">
              Diseño web
            </p>
            <h2 className="text-3xl font-semibold leading-[1.15] tracking-tight text-white md:text-5xl">
              Tu web no debería verse{" "}
              <span className="italic">como el de todos.</span>
            </h2>
            <p className="max-w-[55ch] text-base leading-relaxed text-white/70">
              Diseñamos sitios que se sienten caros, se ven únicos y convierten
              visitantes en clientes. Esta misma página es la demo.
            </p>
          </div>

          {/* Principios con demos vivos */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPIOS.map((p) => (
              <article
                key={p.n}
                className="space-y-4 rounded-md border border-white/10 bg-white/5 p-5 transition duration-200 hover:border-white/20 hover:bg-white/10"
              >
                <div className="flex min-h-[40px] items-center">{p.demo}</div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-white">
                    <span className="mr-2 font-mono text-xs text-orange">
                      {p.n}
                    </span>
                    {p.titulo}
                  </h3>
                  <p className="text-xs leading-relaxed text-white/60">
                    {p.desc}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {/* Proceso */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">
              Cómo trabajamos
            </h3>
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PROCESO.map((paso) => (
                <li
                  key={paso.n}
                  className="space-y-2 rounded-md border border-white/10 bg-white/5 p-4"
                >
                  <span className="font-mono text-sm font-medium text-orange">
                    {paso.n}
                  </span>
                  <h4 className="text-sm font-semibold text-white">
                    {paso.titulo}
                  </h4>
                  <p className="text-xs leading-relaxed text-white/60">
                    {paso.desc}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* CTA de diseño */}
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-md">
              <p className="text-lg font-medium text-white">
                Tu próximo sitio empieza con una conversación.
              </p>
              <p className="mt-1 text-sm text-white/60">
                Sin compromiso. Escuchamos lo que necesitas y te decimos
                honestamente si podemos ayudarte.
              </p>
            </div>
            <a
              href="#contacto"
              className="btn bg-white px-6 py-2.5 text-base text-navy hover:bg-block active:translate-y-px"
            >
              Hablemos de tu proyecto
            </a>
          </div>

          {/* Meta: la página ES la demo */}
          <p className="text-xs text-white/40">
            Esta página fue diseñada y construida por Yellow. Cada tipografía,
            color y sombra es deliberada — y así se vería tu proyecto.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* SECCIÓN 3: CONTACTO                              */}
      {/* ══════════════════════════════════════════════ */}
      <section
        id="contacto"
        className="rounded-md border border-line bg-gradient-to-br from-block to-panel p-8 md:p-12"
      >
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div className="flex max-w-2xl items-start gap-4">
            <span aria-hidden className="mt-1.5 h-3.5 w-3.5 shrink-0 bg-orange" />
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                Empieza hoy, sin certificado
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Yellow funciona en modo simulado desde el primer minuto. Sube
                tu .p12 cuando estés listo y las mismas pantallas hablan con
                el SII real, sin migrar nada.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {ctx ? (
              <Link
                href="/dashboard"
                className="btn btn-primary px-5 py-2.5 text-base active:translate-y-px"
              >
                Ir al panel
              </Link>
            ) : (
              <Link
                href="/register"
                className="btn btn-primary px-5 py-2.5 text-base active:translate-y-px"
              >
                Crear cuenta
              </Link>
            )}
            <p className="text-center text-xs text-ink-soft">
              {SOPORTE_EMAIL ? (
                <>
                  ¿Dudas?{" "}
                  <a
                    href={`mailto:${SOPORTE_EMAIL}`}
                    className="underline hover:text-orange-ink"
                  >
                    Escríbenos a {SOPORTE_EMAIL}
                  </a>
                </>
              ) : (
                "¿Dudas? Crea tu cuenta y pruébalo en modo simulado."
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

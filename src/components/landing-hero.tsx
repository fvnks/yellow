import Link from "next/link";
import { InteractiveGridPattern } from "@/components/interactive-grid-pattern";

const PREVIEW_FILAS = [
  { doc: "Factura 33 · 1000", parte: "Cliente SpA", total: "$119.000", estado: "ACEPTADO", chip: "chip chip-ok" },
  { doc: "Guía 52 · 3", parte: "Cliente SpA", total: "$47.600", estado: "ENVIADO", chip: "chip chip-orange" },
  { doc: "Factura 33 · 1001", parte: "Cliente SpA", total: "$95.200", estado: "ANULADO", chip: "chip chip-muted" },
  { doc: "N. crédito 61 · 4", parte: "Cliente SpA", total: "$119.000", estado: "ACEPTADO", chip: "chip chip-ok" },
];

const SIDEBAR_ITEMS = ["Ventas", "Compras", "Gastos", "Cotizaciones", "Directorio"];

/**
 * Hero con energía: gradiente cálido, grid pattern con tinte amarillo,
 * preview con glow accent, tipografía masiva. El producto ES la estrella.
 */
export function LandingHero({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="relative pb-20 pt-8 md:pb-28">
      {/* Grid interactivo: dots amarillos siguen el cursor */}
      <InteractiveGridPattern
        className="pointer-events-none absolute inset-0"
        gap={36}
        dotSize={2.5}
        radius={200}
        fade="radial-gradient(ellipse 100% 70% at 50% 30%, black, transparent)"
      />
      {/* Glow cálido centrado */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[24rem] w-[40rem] -translate-x-1/2 rounded-full bg-accent/8 blur-3xl"
      />

      {/* Contenido (relative: pinta sobre el grid) */}
      <div className="relative space-y-7 text-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-semibold text-accent-text">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            SII Chile · Facturación electrónica
          </span>
        </div>

        <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[0.95] tracking-tighter text-ink md:text-7xl">
          Software que factura.
          <br />
          <span className="text-accent">Diseño que convierte.</span>
        </h1>

        <p className="mx-auto max-w-md text-base leading-relaxed text-muted md:text-lg">
          Todo el ciclo del DTE en un solo lugar: emisión, compras, gastos,
          cotizaciones y libros.
        </p>

        <div className="pt-2">
          {isAuthed ? (
            <Link
              href="/dashboard"
              className="btn btn-primary px-8 py-3 text-base"
            >
              Ir al panel
            </Link>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="btn btn-primary px-8 py-3 text-base"
              >
                Empezar gratis
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-muted underline underline-offset-4 transition-colors hover:text-ink"
              >
                ¿Ya tienes cuenta? Ingresar
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Preview: shadow con tinte accent, no solo negro */}
      <div className="mt-16 md:mt-20">
        <div className="relative">
          {/* Glow del preview — sutil pero presente */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-4 rounded-2xl bg-accent/5 blur-2xl"
          />
          <div className="relative overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/10">
            {/* Chrome del navegador */}
            <div className="flex items-center gap-2 border-b border-border bg-raised px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
                <span className="h-2.5 w-2.5 rounded-full bg-accent/30" />
              </div>
              <span className="ml-3 rounded-md bg-surface px-3 py-0.5 font-mono text-[11px] text-faint">
                yellow.cl/erp
              </span>
            </div>

            {/* App: sidebar + contenido */}
            <div className="flex">
              <div className="hidden w-44 shrink-0 border-r border-border p-4 md:block">
                <div className="mb-6 flex items-center gap-2">
                  <div className="h-3.5 w-3.5 rounded-[4px] bg-accent" />
                  <span className="text-sm font-bold text-ink">Yellow</span>
                </div>
                <div className="space-y-0.5">
                  {SIDEBAR_ITEMS.map((item, i) => (
                    <div
                      key={item}
                      className={`flex items-center rounded-lg px-2.5 py-1.5 text-xs ${
                        i === 0
                          ? "bg-raised font-semibold text-ink"
                          : "font-medium text-muted"
                      }`}
                    >
                      {i === 0 && (
                        <span className="mr-2 h-3 w-0.5 rounded-full bg-accent" aria-hidden />
                      )}
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-border pt-4">
                  <div className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted">Libros</div>
                  <div className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted">Reportes</div>
                </div>
              </div>

              <div className="min-w-0 flex-1 p-6">
                <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                  {[
                    { label: "Total ventas", value: "$742.310" },
                    { label: "Documentos", value: "47" },
                    { label: "Aceptados", value: "38" },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-[11px] font-medium text-faint">{stat.label}</p>
                      <p className="mt-0.5 font-mono text-xl font-bold text-ink">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 pl-1 text-left text-[11px] font-medium text-faint">Documento</th>
                      <th className="py-2 text-left text-[11px] font-medium text-faint">Receptor</th>
                      <th className="py-2 text-right text-[11px] font-medium text-faint">Total</th>
                      <th className="py-2 pr-1 text-right text-[11px] font-medium text-faint">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PREVIEW_FILAS.map((f) => (
                      <tr key={f.doc} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pl-1 font-medium text-ink">{f.doc}</td>
                        <td className="py-2.5 text-muted">{f.parte}</td>
                        <td className="py-2.5 text-right font-mono font-semibold text-ink">{f.total}</td>
                        <td className="py-2.5 pr-1 text-right">
                          <span className={f.chip}>{f.estado}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

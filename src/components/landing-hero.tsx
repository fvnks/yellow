import Link from "next/link";

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
  {
    doc: "N. crédito 61 · 4",
    parte: "Cliente SpA",
    total: "$119.000",
    estado: "ACEPTADO",
    chip: "chip chip-ok",
  },
];

/**
 * Hero centrado de la landing: Badge → Título → Descripción → CTA → Preview
 * del producto. Usa exclusivamente los tokens, componentes y clases del
 * sistema existente (btn, chip, tbl, panel).
 */
export function LandingHero({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="relative space-y-8 pt-4 text-center md:pt-8">
      {/* Glow centrado */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-96 -translate-x-1/2 rounded-full bg-orange/8 blur-3xl"
      />

      {/* Badge */}
      <div className="relative">
        <span className="chip chip-orange inline-flex text-xs font-semibold">
          Facturación electrónica · SII Chile
        </span>
      </div>

      {/* Título */}
      <h1 className="relative mx-auto max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-ink md:text-6xl">
        Todo el ciclo de tus DTE,{" "}
        <span className="text-orange-ink">en un solo lugar</span>
      </h1>

      {/* Descripción */}
      <p className="relative mx-auto max-w-[60ch] text-base leading-relaxed text-ink-soft md:text-lg">
        Emite facturas, registra compras, controla gastos, cotiza y descarga
        tus libros. Del borrador al TED.
      </p>

      {/* CTA */}
      <div className="relative flex flex-wrap items-center justify-center gap-3">
        {isAuthed ? (
          <Link
            href="/dashboard"
            className="btn btn-primary px-6 py-3 text-base active:translate-y-px"
          >
            Ir al panel
          </Link>
        ) : (
          <>
            <Link
              href="/register"
              className="btn btn-primary px-6 py-3 text-base active:translate-y-px"
            >
              Crear cuenta
            </Link>
            <Link
              href="/login"
              className="btn btn-ghost px-6 py-3 text-base active:translate-y-px"
            >
              Ingresar
            </Link>
          </>
        )}
      </div>

      {/* Preview del producto */}
      <div className="relative mx-auto max-w-4xl pt-6 md:pt-10">
        {/* Sombra offset: da profundidad al preview */}
        <div
          aria-hidden
          className="absolute inset-0 translate-x-3 translate-y-3 rounded-lg bg-navy/5"
        />
        {/* Glow lateral sutil */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 top-1/4 h-40 w-40 rounded-full bg-orange/10 blur-3xl"
        />
        <div className="panel relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between border-b border-line bg-block px-4 py-3">
            <span className="text-sm font-medium text-ink-soft">
              Ventas · septiembre 2026
            </span>
            <span className="text-sm text-ink-soft">XML · PDF por fila</span>
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
                    <td className="text-right font-medium">{f.total}</td>
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
  );
}

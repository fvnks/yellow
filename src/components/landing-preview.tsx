/**
 * Previews del hero, uno por oferta.
 *
 * El de ERP es el mock de la app: fue lo primero que probó que el producto se
 * entiende de un vistazo. El de diseño es un strip de tres piezas y no usa
 * fotos: material gráfico propio o nada, nunca aleatorio.
 */

const PREVIEW_FILAS = [
  { doc: "Factura 33 · 1000", parte: "Cliente SpA", total: "$119.000", estado: "ACEPTADO", chip: "chip chip-ok" },
  { doc: "Guía 52 · 3", parte: "Cliente SpA", total: "$47.600", estado: "ENVIADO", chip: "chip chip-orange" },
  { doc: "Factura 33 · 1001", parte: "Cliente SpA", total: "$95.200", estado: "ANULADO", chip: "chip chip-muted" },
  { doc: "N. crédito 61 · 4", parte: "Cliente SpA", total: "$119.000", estado: "ACEPTADO", chip: "chip chip-ok" },
];

const SIDEBAR_ITEMS = ["Ventas", "Compras", "Gastos", "Cotizaciones", "Directorio"];

const STATS = [
  { label: "Total ventas", value: "$742.310" },
  { label: "Documentos", value: "47" },
  { label: "Aceptados", value: "38" },
];

export function LandingPreviewErp() {
  return (
    <div className="rise relative" style={{ animationDelay: "520ms" }}>
      <div className="card-elevated grain relative overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-raised px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-border" />
            <span className="h-3 w-3 rounded-full bg-border" />
            <span className="h-3 w-3 rounded-full bg-accent/40" />
          </div>
          <span className="ml-3 rounded-md bg-surface px-3 py-0.5 font-mono text-xs text-muted">
            yellow.cl/erp
          </span>
        </div>

        <div className="flex">
          <div className="hidden w-44 shrink-0 border-r border-border p-4 md:block">
            <div className="mb-6 flex items-center gap-2">
              <div className="h-4 w-4 rounded-[4px] bg-accent" />
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

          <div className="min-w-0 flex-1 p-4 md:p-6">
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <p className="text-xs font-medium text-muted">{stat.label}</p>
                  <p className="mt-0.5 font-mono text-xl font-bold text-ink">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pl-1 text-left text-xs font-medium text-muted">Documento</th>
                  <th className="hidden py-2 text-left text-xs font-medium text-muted md:table-cell">Receptor</th>
                  <th className="py-2 text-right text-xs font-medium text-muted">Total</th>
                  <th className="py-2 pr-1 text-right text-xs font-medium text-muted">Estado</th>
                </tr>
              </thead>
              <tbody>
                {PREVIEW_FILAS.map((f) => (
                  <tr key={f.doc} className="border-b border-border/50 last:border-0">
                    <td className="whitespace-nowrap py-2.5 pl-1 font-medium text-ink">{f.doc}</td>
                    <td className="hidden py-2.5 text-muted md:table-cell">{f.parte}</td>
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
  );
}

const PIEZAS = [
  {
    n: "01",
    titulo: "Diseño web",
    desc: "Sitios corporativos que se sienten caros y funcionan perfecto en móvil.",
  },
  {
    n: "02",
    titulo: "Identidad visual",
    desc: "Paleta, tipografía y la pieza que la gente recuerda.",
  },
  {
    n: "03",
    titulo: "Landing pages",
    desc: "Una página, un mensaje, un botón. Diseñada para convertir.",
  },
];

export function LandingPreviewDiseno() {
  return (
    <div className="rise relative" style={{ animationDelay: "520ms" }}>
      <div className="relative grid gap-4 md:grid-cols-3">
        {PIEZAS.map((pieza, i) => (
          <div
            key={pieza.n}
            className="card-elevated grain rise p-6 text-left"
            style={{ animationDelay: `${620 + i * 90}ms` }}
          >
            <span className="eyebrow text-accent-text">
              {pieza.n}
            </span>
            <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">{pieza.titulo}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{pieza.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

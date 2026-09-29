"use client";

export const FEATURES = [
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

/**
 * Features como tarjetas elevadas con hover sutil.
 * Hairline superior que se tiñe de acento al hover.
 */
export function LandingFeatures() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map((f, i) => (
        <div
          key={f.title}
          className="card-elevated p-6"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <span
            aria-hidden
            className="absolute left-0 top-0 h-px w-0 bg-accent transition-all duration-500 ease-out group-hover:w-full"
          />
          <div className="relative pt-1">
            <span className="eyebrow text-muted">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink">
              {f.title}
            </h3>
            <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-muted">
              {f.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

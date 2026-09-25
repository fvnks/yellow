"use client";

import {
  FileText,
  ShoppingCart,
  FilePlus,
  BookOpen,
} from "@phosphor-icons/react";

const FEATURES = [
  {
    icon: FileText,
    title: "Emisión y anulación",
    desc: "Facturas, guías y notas firmadas con TED. Folios desde tu propio CAF, consulta de estado ante el SII y anulación con nota de crédito automática.",
  },
  {
    icon: ShoppingCart,
    title: "Compras y gastos",
    desc: "Registra facturas de proveedores, gastos de caja menor con reembolso, y clasifica por área y categoría. El desglose aparece solo en Reportes.",
  },
  {
    icon: FilePlus,
    title: "Cotizaciones",
    desc: "Propuestas con correlativo propio que se convierten en factura con un clic. Receptor, ítems y dimensiones se repiten sin re-escribir nada.",
  },
  {
    icon: BookOpen,
    title: "Libros y registro CSV",
    desc: "Libro de compras y ventas por período. El XML oficial listo para el SII y el registro CSV del portal cuando subas tus credenciales.",
  },
];

/**
 * Features con iconos Phosphor y hover con acento.
 */
export function LandingFeatures() {
  return (
    <div className="grid gap-x-10 gap-y-14 md:grid-cols-2">
      {FEATURES.map((f) => (
        <div key={f.title} className="group flex gap-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface transition-colors group-hover:border-accent/30 group-hover:bg-accent/5">
            <f.icon
              size={20}
              weight="duotone"
              aria-hidden
              className="text-accent-text"
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-ink">
              {f.title}
            </h3>
            <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-muted">
              {f.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

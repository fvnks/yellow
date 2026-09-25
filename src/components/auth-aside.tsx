import { SOPORTE_EMAIL } from "@/lib/contacto";

/**
 * Panel de marca para las pantallas de acceso. Solo visible en lg+.
 */
export function AuthAside() {
  return (
    <aside className="relative hidden min-h-[75vh] flex-col justify-between overflow-hidden rounded-xl border border-border bg-raised p-10 lg:flex">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative">
        <span aria-hidden className="block h-5 w-5 rounded-md bg-accent" />
        <p className="mt-8 max-w-sm text-2xl font-bold leading-snug tracking-tight text-ink">
          Facturación electrónica ante el SII, sin fricción.
        </p>
      </div>
      <ul className="relative space-y-3 text-sm leading-relaxed text-muted">
        <li className="flex gap-2.5">
          <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
          Emisión con TED, CAF y folios propios; anulación con nota de crédito.
        </li>
        <li className="flex gap-2.5">
          <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
          Compras registradas y clasificadas por área y categoría.
        </li>
        <li className="flex gap-2.5">
          <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
          Libros de compras y ventas con registro CSV del portal del SII.
        </li>
      </ul>
      <p className="relative text-xs text-faint">
        {SOPORTE_EMAIL
          ? `¿Dudas? Escríbenos a ${SOPORTE_EMAIL}`
          : "Parte en modo simulado, sin certificado."}
      </p>
    </aside>
  );
}

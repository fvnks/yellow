import { SOPORTE_EMAIL } from "@/lib/contacto";

/**
 * Panel de marca para las pantallas de acceso (login y registro).
 * Solo visible en lg+; en móvil el formulario ocupa todo. Navy con
 * degradado y manchas suaves de marca: profundidad sin perder el tono
 * institucional del chrome del app.
 */
export function AuthAside() {
  return (
    <aside className="relative hidden min-h-[75vh] flex-col justify-between overflow-hidden rounded-md bg-gradient-to-br from-navy to-navy-hover p-10 lg:flex">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-orange/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-blue-bright/10 blur-3xl"
      />

      <div className="relative">
        <span aria-hidden className="block h-4 w-4 bg-orange" />
        <p className="mt-8 max-w-sm text-2xl font-semibold leading-snug tracking-tight text-white">
          Facturación electrónica ante el SII, sin fricción.
        </p>
      </div>
      <ul className="relative space-y-3 text-sm leading-relaxed text-white/85">
        <li className="flex gap-2.5">
          <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 bg-orange" />
          Emisión con TED, CAF y folios propios; anulación con nota de
          crédito.
        </li>
        <li className="flex gap-2.5">
          <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 bg-orange" />
          Compras registradas y clasificadas por área y categoría.
        </li>
        <li className="flex gap-2.5">
          <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 bg-orange" />
          Libros de compras y ventas con registro CSV del portal del SII.
        </li>
      </ul>
      <p className="relative text-xs text-white/70">
        {SOPORTE_EMAIL
          ? `¿Dudas? Escríbenos a ${SOPORTE_EMAIL}`
          : "Parte en modo simulado, sin certificado."}
      </p>
    </aside>
  );
}

/**
 * Panel de marca para las pantallas de acceso (login y registro).
 * Solo visible en lg+; en móvil el formulario ocupa todo. Navy fijo de la
 * marca con el cuadrado naranja como acento, igual que el chrome del app.
 */
export function AuthAside() {
  return (
    <aside className="hidden min-h-[75vh] flex-col justify-between rounded-md bg-navy p-10 lg:flex">
      <div>
        <span aria-hidden className="block h-4 w-4 bg-orange" />
        <p className="mt-8 max-w-sm text-2xl font-semibold leading-snug tracking-tight text-white">
          Facturación electrónica ante el SII, sin fricción.
        </p>
      </div>
      <ul className="space-y-3 text-sm leading-relaxed text-white/85">
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
      <p className="text-xs text-white/70">
        Parte en modo simulado, sin certificado.
      </p>
    </aside>
  );
}

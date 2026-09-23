/** Pie navy al estilo sii.cl: marca, alcance real del producto y nada más. */
export function AppFooter() {
  return (
    <footer className="mt-10 bg-navy">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-xs text-white/75">
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 bg-orange" />
          <span className="font-semibold text-white">Yellow</span>
          <span>Facturación electrónica · DTE ante el SII</span>
        </span>
        <span>Emisión, anulación y registro de compras y ventas</span>
      </div>
    </footer>
  );
}

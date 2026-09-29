import Link from "next/link";


/** Pie minimal: marca con square accent y accesos legales. */
export function AppFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted">
        <span className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 transition-colors hover:text-ink"
            aria-label="Yellow, ir al inicio"
          >
            <span aria-hidden className="h-3 w-3 rounded-sm bg-accent" />
            <span className="font-bold text-ink">Yellow</span>
          </Link>
          <span>Facturación electrónica · Diseño web</span>
        </span>
        <span className="flex flex-wrap items-center gap-4">
          <Link href="/contacto" className="inline-flex min-h-11 items-center hover:text-ink">
            Contacto
          </Link>
          <Link href="/diseno" className="inline-flex min-h-11 items-center hover:text-ink">
            Diseño web
          </Link>
          <Link href="/terminos" className="inline-flex min-h-11 items-center hover:text-ink">
            Términos
          </Link>
          <Link href="/privacidad" className="inline-flex min-h-11 items-center hover:text-ink">
            Privacidad
          </Link>
        </span>
      </div>
    </footer>
  );
}

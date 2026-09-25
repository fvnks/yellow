import Link from "next/link";
import { SOPORTE_EMAIL } from "@/lib/contacto";

/** Pie minimal: marca con square accent y accesos legales. */
export function AppFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted">
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 rounded-sm bg-accent" />
          <span className="font-bold text-ink">Yellow</span>
          <span>Facturación electrónica · Diseño web</span>
        </span>
        <span className="flex items-center gap-4">
          {SOPORTE_EMAIL ? (
            <a href={`mailto:${SOPORTE_EMAIL}`} className="hover:text-ink">
              Contacto
            </a>
          ) : (
            <Link href="/#contacto" className="hover:text-ink">
              Contacto
            </Link>
          )}
          <Link href="/diseno" className="hover:text-ink">
            Diseño web
          </Link>
          <Link href="/terminos" className="hover:text-ink">
            Términos
          </Link>
          <Link href="/privacidad" className="hover:text-ink">
            Privacidad
          </Link>
        </span>
      </div>
    </footer>
  );
}

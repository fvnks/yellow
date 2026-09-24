import Link from "next/link";
import { SOPORTE_EMAIL } from "@/lib/contacto";

/** Pie navy: marca con las dos líneas de negocio y accesos legales. */
export function AppFooter() {
  return (
    <footer className="mt-10 bg-navy">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-white/75">
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 bg-orange" />
          <span className="font-semibold text-white">Yellow</span>
          <span>Facturación electrónica · Diseño web</span>
        </span>
        <span className="flex items-center gap-4">
          {SOPORTE_EMAIL ? (
            <a href={`mailto:${SOPORTE_EMAIL}`} className="hover:text-white">
              Contacto
            </a>
          ) : (
            <Link href="/#contacto" className="hover:text-white">
              Contacto
            </Link>
          )}
          <Link href="/diseno" className="hover:text-white">
            Diseño web
          </Link>
          <Link href="/terminos" className="hover:text-white">
            Términos
          </Link>
          <Link href="/privacidad" className="hover:text-white">
            Privacidad
          </Link>
        </span>
      </div>
    </footer>
  );
}

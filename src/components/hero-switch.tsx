import Link from "next/link";
import { OFERTAS, type Oferta } from "@/lib/oferta";

/**
 * Selector de oferta del hero.
 *
 * Son enlaces, no estado en cliente: cada oferta tiene su propia URL, el
 * servidor renderiza la variante entera y el visitante puede guardar o
 * compartir la que le interesa. Sin JS no hay parpadeo de hidratacion y el
 * buscador ve las dos variantes como la misma pagina.
 */
export function HeroSwitch({ oferta }: { oferta: Oferta }) {
  return (
    <div
      role="group"
      aria-label="Elige la oferta de Yellow"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-sm"
    >
      {OFERTAS.map((opcion) => {
        const activa = opcion.id === oferta;
        return (
          <Link
            key={opcion.id}
            href={opcion.href}
            aria-current={activa ? "true" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-xs font-semibold transition-colors ${
              activa ? "bg-ink text-bg" : "text-muted hover:text-ink"
            }`}
          >
            {opcion.label}
          </Link>
        );
      })}
    </div>
  );
}

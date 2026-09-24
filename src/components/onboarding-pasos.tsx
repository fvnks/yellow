"use client";

import Link from "next/link";
import { CheckCircle, Circle } from "@phosphor-icons/react";

export type PasoOnboarding = {
  titulo: string;
  detalle: string;
  href: string;
  hecho: boolean;
};

/**
 * Checklist de puesta en marcha del onboarding: pasos con estado real
 * (calculado en el server) y acceso directo a donde se completan.
 */
export function OnboardingPasos({ pasos }: { pasos: PasoOnboarding[] }) {
  return (
    <ol className="divide-y divide-line">
      {pasos.map((paso) => (
        <li
          key={paso.titulo}
          className="flex flex-wrap items-center justify-between gap-3 py-3.5"
        >
          <span className="flex items-center gap-3">
            {paso.hecho ? (
              <CheckCircle
                size={20}
                weight="bold"
                aria-hidden
                className="shrink-0 text-ok"
              />
            ) : (
              <Circle
                size={20}
                weight="bold"
                aria-hidden
                className="shrink-0 text-line"
              />
            )}
            <span>
              <span
                className={
                  paso.hecho
                    ? "block text-sm font-medium text-ink-soft"
                    : "block text-sm font-medium text-ink"
                }
              >
                {paso.titulo}
              </span>
              <span className="block text-xs text-ink-soft">
                {paso.detalle}
              </span>
            </span>
          </span>
          <Link
            href={paso.href}
            className="btn btn-ghost px-3 py-1 text-xs"
          >
            {paso.hecho ? "Revisar" : "Hacerlo"}
          </Link>
        </li>
      ))}
    </ol>
  );
}

"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { CaretRight } from "@phosphor-icons/react";
import Link from "next/link";
import { PillButton } from "@/components/pill-button";
import { HeroSwitch } from "@/components/hero-switch";
import {
  LandingPreviewDiseno,
  LandingPreviewErp,
} from "@/components/landing-preview";
import type { Oferta } from "@/lib/oferta";

const GAP = 40;
const DOT = 2;
const FOLLOW_RADIUS = 200;
const BASE_COLOR = "var(--color-border-hover, #d4d4d8)";
const ACCENT_COLOR = "var(--color-accent, #f59e0b)";

/**
 * Hero interactivo con grid de dots que siguen el cursor con spring physics.
 * El mouse se trackea en la SECCIÓN completa — los dots responden
 * incluso cuando el cursor está sobre el texto o el preview.
 */
export function LandingHero({
  isAuthed,
  oferta,
}: {
  isAuthed: boolean;
  oferta: Oferta;
}) {
  const esErp = oferta === "erp";
  const sectionRef = useRef<HTMLElement>(null);

  const mouseX = useMotionValue(-9999);
  const mouseY = useMotionValue(-9999);

  // Spring: el cursor sigue con inercia suave (no instantáneo)
  const springX = useSpring(mouseX, { stiffness: 160, damping: 24, mass: 0.8 });
  const springY = useSpring(mouseY, { stiffness: 160, damping: 24, mass: 0.8 });

  // Mask reactiva: dots amarillos visibles cerca del cursor
  const cursorMask = useTransform(
    [springX, springY],
    ([x, y]: number[]) =>
      `radial-gradient(circle ${FOLLOW_RADIUS}px at ${x}px ${y}px, black 20%, transparent 75%)`,
  );

  function handleMouseMove(e: React.MouseEvent) {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }

  function handleMouseLeave() {
    mouseX.set(-9999);
    mouseY.set(-9999);
  }

  const dots = (color: string) =>
    `radial-gradient(circle ${DOT}px at center, ${color} 100%, transparent 100%)`;

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative overflow-hidden pb-20 pt-8 md:pb-28"
    >
      {/* ── Grid interactivo (dos capas, pointer-events-none) ── */}
      {/* Capa base: dots grises siempre visibles */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          backgroundImage: dots(BASE_COLOR),
          backgroundSize: `${GAP}px ${GAP}px`,
          opacity: 0.7,
          maskImage:
            "radial-gradient(ellipse 100% 70% at 50% 25%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 100% 70% at 50% 25%, black, transparent)",
        }}
      />
      {/* Capa spring: dots amarillos que siguen el cursor */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          backgroundImage: dots(ACCENT_COLOR),
          backgroundSize: `${GAP}px ${GAP}px`,
          WebkitMaskImage: cursorMask,
        }}
      />
      {/* Glow cálido */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[24rem] w-[40rem] -translate-x-1/2 rounded-full bg-accent/8 blur-3xl"
      />

      {/* ── Contenido (relative: pinta sobre el grid) ── */}
      <div className="relative space-y-7 text-center">
        {/* Selector de oferta: la home pregunta qué viene a buscar el visitante */}
        <div>
          <HeroSwitch oferta={oferta} />
        </div>

        {esErp ? (
          <div>
            <a
              href="#funciones"
              className="group inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-semibold transition-colors hover:border-accent/40 hover:bg-accent/10"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="shiny-text">
                SII Chile · Facturación electrónica
              </span>
              <CaretRight
                size={12}
                weight="bold"
                aria-hidden
                className="text-accent-text transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </a>
          </div>
        ) : (
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="text-accent-text">
                Estudio de diseño · Sitios, identidad y landings
              </span>
            </span>
          </div>
        )}

        {esErp ? (
          <>
            <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[0.95] tracking-tighter text-ink md:text-7xl">
              Software que factura.
              <br />
              <span className="text-accent">Diseño que convierte.</span>
            </h1>

            <p className="mx-auto max-w-md text-base leading-relaxed text-muted md:text-lg">
              Todo el ciclo del DTE en un solo lugar: emisión, compras, gastos,
              cotizaciones y libros.
            </p>
          </>
        ) : (
          <>
            <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[0.95] tracking-tighter text-ink md:text-7xl">
              Diseño que <span className="italic text-accent">convierte.</span>
            </h1>

            <p className="mx-auto max-w-md text-base leading-relaxed text-muted md:text-lg">
              Sitios, identidad y landings para negocios que necesitan verse tan
              bien como funcionan. Una conversación primero, sin plantillas.
            </p>
          </>
        )}

        <div className="pt-2">
          {esErp ? (
            isAuthed ? (
              <PillButton href="/dashboard" className="btn-primary px-8 py-3 text-base">
                Ir al panel
              </PillButton>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-4">
                <PillButton href="/register" className="btn-primary px-8 py-3 text-base">
                  Empezar gratis
                </PillButton>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted underline underline-offset-4 transition-colors hover:text-ink"
                >
                  ¿Ya tienes cuenta? Ingresar
                </Link>
              </div>
            )
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-4">
              <PillButton href="/diseno" className="btn-primary px-8 py-3 text-base">
                Ver el estudio de diseño
              </PillButton>
              <a
                href="/diseno#hablemos"
                className="text-sm font-medium text-muted underline underline-offset-4 transition-colors hover:text-ink"
              >
                Hablemos de tu proyecto
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Preview de la oferta elegida */}
      {esErp ? <LandingPreviewErp /> : <LandingPreviewDiseno />}
    </section>
  );
}

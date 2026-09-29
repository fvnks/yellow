"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import Link from "next/link";
import { PillButton } from "@/components/pill-button";
import { HeroSwitch } from "@/components/hero-switch";
import {
  LandingPreviewDiseno,
  LandingPreviewErp,
} from "@/components/landing-preview";
import { SOPORTE_EMAIL } from "@/lib/contacto";
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
      className="relative overflow-hidden section-space-lg grain"
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
      {/* Glow cálido - más sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[24rem] w-[40rem] -translate-x-1/2 rounded-full bg-accent/5 blur-3xl"
      />
      {/* Glow secundario en la esquina inferior */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-accent/5 blur-3xl"
      />

      {/* ── Contenido (relative: pinta sobre el grid) ── */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 text-center">
        {/* ── Hero switch / eyebrow ── */}
        <div className="mb-6">
          <HeroSwitch oferta={oferta} />
        </div>

        {/* ── Badge contextual ── */}
        <div className="rise mb-8" style={{ animationDelay: "90ms" }}>
          {esErp ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="text-accent-text">Modo simulado · sin certificado · listo para SII</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="text-accent-text">Estudio de diseño · Sitios, identidad y landings a medida</span>
            </div>
          )}
        </div>

        {esErp ? (
          <>
            <h1
              className="rise mx-auto max-w-5xl text-5xl font-bold leading-[0.95] tracking-tighter text-ink md:text-7xl lg:text-8xl"
              style={{ animationDelay: "180ms" }}
            >
              Software que factura.
              <br />
              <span className="text-gradient-accent">Diseño que convierte.</span>
            </h1>

            <p
              className="rise mx-auto max-w-2xl text-lg leading-relaxed text-muted md:text-xl"
              style={{ animationDelay: "270ms" }}
            >
              Todo el ciclo del DTE en un solo lugar: emisión, compras, gastos,
              cotizaciones y libros. Modo simulado desde el minuto uno.
            </p>
          </>
        ) : (
          <>
            <h1
              className="rise mx-auto max-w-5xl text-5xl font-bold leading-[0.95] tracking-tighter text-ink md:text-7xl lg:text-8xl"
              style={{ animationDelay: "180ms" }}
            >
              Diseño que <span className="italic text-gradient-accent">convierte.</span>
            </h1>

            <p
              className="rise mx-auto max-w-2xl text-lg leading-relaxed text-muted md:text-xl"
              style={{ animationDelay: "270ms" }}
            >
              Sitios, identidad y landings para negocios que necesitan verse tan
              bien como funcionan. Una conversación primero, sin plantillas.
            </p>
          </>
        )}

        {/* ── CTAs ── */}
        <div className="rise flex flex-col sm:flex-row items-center justify-center gap-4 pt-2" style={{ animationDelay: "360ms" }}>
          {esErp ? (
            isAuthed ? (
              <PillButton
                href="/dashboard"
                className="btn-accent min-h-11 px-8 py-3 text-base focus-ring"
                circleColor="#ffffff"
                hoverTextColor="#09090b"
              >
                Ir al panel
              </PillButton>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
                <PillButton
                  href="/register"
                  className="btn-accent min-h-11 px-8 py-3 text-base focus-ring"
                  circleColor="#ffffff"
                  hoverTextColor="#09090b"
                >
                  Empezar gratis
                </PillButton>
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center justify-center px-6 py-2.5 text-sm font-medium text-muted underline underline-offset-4 transition-colors hover:text-ink focus-ring rounded-full"
                >
                  ¿Ya tienes cuenta? Ingresar
                </Link>
              </div>
            )
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <PillButton
                href="/diseno"
                className="btn-primary min-h-11 px-8 py-3 text-base focus-ring"
              >
                Ver el estudio de diseño
              </PillButton>
              <a
                href="/diseno#hablemos"
                className="inline-flex min-h-11 items-center justify-center px-6 py-2.5 text-sm font-medium text-muted underline underline-offset-4 transition-colors hover:text-ink focus-ring rounded-full"
              >
                Hablemos de tu proyecto
              </a>
            </div>
          )}
        </div>

        {/* ── Trust signals ── */}
        <p className="rise mt-8 text-sm text-muted" style={{ animationDelay: "450ms" }}>
          {esErp ? (
            <>
              {SOPORTE_EMAIL ? (
                <>
                  ¿Dudas?{" "}
                  <a
                    href={`mailto:${SOPORTE_EMAIL}`}
                    className="text-muted underline underline-offset-4 transition-colors hover:text-accent-text"
                  >
                    {SOPORTE_EMAIL}
                  </a>
                </>
              ) : (
                "Sin compromiso. Crea tu cuenta y pruébalo."
              )}
              {" · "}
              <Link
                href="/diseno"
                className="text-muted underline underline-offset-4 transition-colors hover:text-accent-text"
              >
                ¿Necesitas diseño web?
              </Link>
            </>
          ) : (
            <Link
              href="/"
              className="text-muted underline underline-offset-4 transition-colors hover:text-accent-text"
            >
              ¿Buscas facturación electrónica?
            </Link>
          )}
        </p>
      </div>

      {/* Preview de la oferta elegida - elevated card */}
      <div className="rise relative mt-16" style={{ animationDelay: "520ms" }}>
        {esErp ? <LandingPreviewErp /> : <LandingPreviewDiseno />}
      </div>
    </section>
  );
}

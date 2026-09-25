"use client";

import { useCallback, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

/**
 * InteractiveGridPattern — MagicUI-style con motion/react.
 * Dos capas de dots: base tenue + accent amarillo con spring physics.
 * El mask del cursor sigue con spring (stiffness 160, damping 24).
 */
export function InteractiveGridPattern({
  className = "",
  gap = 40,
  dotSize = 2,
  radius = 220,
  accent = "var(--color-accent, #f59e0b)",
  base = "var(--color-border-hover, #d4d4d8)",
}: {
  className?: string;
  gap?: number;
  dotSize?: number;
  radius?: number;
  accent?: string;
  base?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(-9999);
  const mouseY = useMotionValue(-9999);

  // Spring physics: el cursor sigue con inercia suave
  const springX = useSpring(mouseX, { stiffness: 160, damping: 24, mass: 0.8 });
  const springY = useSpring(mouseY, { stiffness: 160, damping: 24, mass: 0.8 });

  // Mask que sigue al cursor con spring — reactivo y fluido
  const cursorMask = useTransform(
    [springX, springY],
    ([x, y]: number[]) =>
      `radial-gradient(circle ${radius}px at ${x}px ${y}px, black 20%, transparent 75%)`,
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY],
  );

  const handleMouseLeave = useCallback(() => {
    mouseX.set(-9999);
    mouseY.set(-9999);
  }, [mouseX, mouseY]);

  const dots = (color: string) =>
    `radial-gradient(circle ${dotSize}px at center, ${color} 100%, transparent 100%)`;

  return (
    <div
      ref={ref}
      className={`overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Dots base — siempre visibles */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: dots(base),
          backgroundSize: `${gap}px ${gap}px`,
          opacity: 0.7,
        }}
      />
      {/* Dots accent — aparecen cerca del cursor con spring */}
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: dots(accent),
          backgroundSize: `${gap}px ${gap}px`,
          WebkitMaskImage: cursorMask,
        }}
      />
    </div>
  );
}

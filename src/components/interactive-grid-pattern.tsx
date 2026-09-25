"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Grid de puntos interactivo — inspirado en MagicUI.
 * Dos capas de dots: una base tenue siempre visible,
 * y una capa amarilla que aparece cerca del cursor con transición suave.
 * Sin dependencias externas.
 */
export function InteractiveGridPattern({
  className = "",
  gap = 36,
  dotSize = 2.5,
  radius = 220,
  accent = "var(--color-accent)",
  base = "var(--color-border-hover)",
  fade = "radial-gradient(ellipse 100% 80% at 50% 20%, black, transparent)",
}: {
  className?: string;
  gap?: number;
  dotSize?: number;
  radius?: number;
  accent?: string;
  base?: string;
  fade?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 9999, y: 9999 });
  const [hovering, setHovering] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleMouseEnter = useCallback(() => setHovering(true), []);
  const handleMouseLeave = useCallback(() => {
    setHovering(false);
    setPos({ x: 9999, y: 9999 });
  }, []);

  const dotPattern = (color: string) =>
    `radial-gradient(circle ${dotSize}px at center, ${color} 100%, transparent 100%)`;

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Capa base: dots siempre visibles */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: dotPattern(base),
          backgroundSize: `${gap}px ${gap}px`,
          maskImage: fade,
          WebkitMaskImage: fade,
          opacity: 0.8,
        }}
      />
      {/* Capa interactiva: dots amarillos cerca del cursor */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: dotPattern(accent),
          backgroundSize: `${gap}px ${gap}px`,
          maskImage: `radial-gradient(circle ${radius}px at ${pos.x}px ${pos.y}px, black 20%, transparent 70%)`,
          WebkitMaskImage: `radial-gradient(circle ${radius}px at ${pos.x}px ${pos.y}px, black 20%, transparent 70%)`,
          opacity: hovering ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      />
    </div>
  );
}

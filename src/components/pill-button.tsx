"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { gsap } from "gsap";

/** hrefs que deben renderizarse como <a> nativo (hash, externos, mailto, tel). */
const NATIVE_HREF = /^(https?:)?\/\/|^mailto:|^tel:|^#/;

/**
 * PillButton — el efecto hover de las píldoras del PillNav
 * (círculo que crece desde abajo + roll vertical del texto, GSAP)
 * aplicado a cualquier botón/CTA de las landings.
 */
export function PillButton({
  href,
  children,
  className = "",
  circleColor = "var(--color-accent, #f59e0b)",
  hoverTextColor = "#09090b",
  ease = "power3.easeOut",
  style,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  /** Color del círculo que sube desde el borde inferior. */
  circleColor?: string;
  /** Color del texto que entra en roll (debe contrastar con circleColor). */
  hoverTextColor?: string;
  ease?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}) {
  const rootRef = useRef<HTMLAnchorElement | null>(null);
  const circleRef = useRef<HTMLSpanElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const layout = () => {
      const root = rootRef.current;
      const circle = circleRef.current;
      if (!root || !circle) return;

      const rect = root.getBoundingClientRect();
      const { width: w, height: h } = rect;
      if (w === 0 || h === 0) return;

      // Círculo circunscrito: al escalar a 1.2 cubre todo el rectángulo.
      const R = ((w * w) / 4 + h * h) / (2 * h);
      const D = Math.ceil(2 * R) + 2;
      const delta =
        Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
      const originY = D - delta;

      circle.style.width = `${D}px`;
      circle.style.height = `${D}px`;
      circle.style.bottom = `-${delta}px`;

      gsap.set(circle, {
        xPercent: -50,
        scale: 0,
        transformOrigin: `50% ${originY}px`,
      });

      const label = root.querySelector(".pill-label");
      const labelHover = root.querySelector(".pill-label-hover");

      if (label) gsap.set(label, { y: 0 });
      if (labelHover) gsap.set(labelHover, { y: h + 12, opacity: 0 });

      tlRef.current?.kill();
      const tl = gsap.timeline({ paused: true });

      tl.to(
        circle,
        { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: "auto" },
        0,
      );
      if (label) {
        tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: "auto" }, 0);
      }
      if (labelHover) {
        gsap.set(labelHover, { y: Math.ceil(h + 100), opacity: 0 });
        tl.to(
          labelHover,
          { y: 0, opacity: 1, duration: 2, ease, overwrite: "auto" },
          0,
        );
      }
      tlRef.current = tl;
    };

    layout();
    const onResize = () => layout();
    window.addEventListener("resize", onResize);
    if (document.fonts?.ready) {
      document.fonts.ready.then(layout).catch(() => {});
    }

    return () => {
      window.removeEventListener("resize", onResize);
      tlRef.current?.kill();
      tweenRef.current?.kill();
    };
  }, [ease]);

  const handleEnter = () => {
    const tl = tlRef.current;
    if (!tl) return;
    tweenRef.current?.kill();
    tweenRef.current = tl.tweenTo(tl.duration(), {
      duration: 0.3,
      ease,
      overwrite: "auto",
    });
  };

  const handleLeave = () => {
    const tl = tlRef.current;
    if (!tl) return;
    tweenRef.current?.kill();
    tweenRef.current = tl.tweenTo(0, {
      duration: 0.2,
      ease,
      overwrite: "auto",
    });
  };

  const cls = `btn pill-btn ${className}`.trim();
  const vars = {
    ...style,
    ["--hover-circle" as string]: circleColor,
    ["--hover-text" as string]: hoverTextColor,
  } as CSSProperties;

  const common = {
    className: cls,
    style: vars,
    onMouseEnter: handleEnter,
    onMouseLeave: handleLeave,
    ref: rootRef,
    ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
  };

  const inner = (
    <>
      <span className="hover-circle" aria-hidden="true" ref={circleRef} />
      <span className="label-stack">
        <span className="pill-label">{children}</span>
        <span className="pill-label-hover" aria-hidden="true">
          {children}
        </span>
      </span>
    </>
  );

  return NATIVE_HREF.test(href) ? (
    <a href={href} {...common}>
      {inner}
    </a>
  ) : (
    <Link href={href} {...common}>
      {inner}
    </Link>
  );
}

"use client";

import { Sun, Moon } from "@/components/icons";
import { useSyncExternalStore } from "react";

const CLAVE = "yellow-tema";

const oyentes = new Set<() => void>();

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function obtenerEstado(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function alternarModo() {
  const html = document.documentElement;
  const activar = !html.classList.contains("dark");
  html.classList.toggle("dark", activar);
  try {
    localStorage.setItem(CLAVE, activar ? "oscuro" : "claro");
  } catch {
    /* sin localStorage: la elección dura la sesión */
  }
  oyentes.forEach((avisa) => avisa());
}

export function ThemeToggle() {
  const oscuro = useSyncExternalStore(
    suscribir,
    obtenerEstado,
    () => false,
  );

  return (
    <button
      type="button"
      onClick={alternarModo}
      aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-pressed={oscuro}
      className="btn btn-ghost min-h-11 min-w-11 px-3"
    >
      {oscuro ? (
        <Sun size={16} aria-hidden />
      ) : (
        <Moon size={16} aria-hidden />
      )}
    </button>
  );
}

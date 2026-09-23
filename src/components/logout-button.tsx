"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Pill naranja sobre la franja navy del header (como "Cerrar Sesión" del SII). */
export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="rounded-full border border-orange px-2.5 py-0.5 text-xs font-medium text-white transition hover:bg-orange/20 disabled:opacity-50"
    >
      {loading ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}

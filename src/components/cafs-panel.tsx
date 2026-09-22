"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Caf = {
  id: string;
  tipoDte: number;
  folioDesde: number;
  folioHasta: number;
  nextFolio: number;
  active: boolean;
};

export function CafsPanel({ tenantId, cafs }: { tenantId: string; cafs: Caf[] }) {
  const router = useRouter();
  const [xml, setXml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/cafs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xml }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo subir el CAF");
        return;
      }
      setXml("");
      setNotice(`CAF tipo ${data.caf.tipoDte}: folios ${data.caf.folioDesde}–${data.caf.folioHasta}.`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        CAF — folios autorizados
      </h2>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {notice}
        </p>
      )}

      {cafs.length > 0 ? (
        <ul className="space-y-2">
          {cafs.map((caf) => {
            const disponibles = Math.max(0, caf.folioHasta - caf.nextFolio + 1);
            return (
              <li
                key={caf.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
              >
                <span className="text-zinc-700 dark:text-zinc-300">
                  Tipo {caf.tipoDte} · folios {caf.folioDesde}–{caf.folioHasta} ·
                  próximo {caf.nextFolio}
                </span>
                <span
                  className={
                    disponibles > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {disponibles} disponibles
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">
          Sin CAF todavía. Solicítalos en el SII y pega aquí el XML.
        </p>
      )}

      <form onSubmit={upload} className="space-y-2">
        <textarea
          value={xml}
          onChange={(e) => setXml(e.target.value)}
          placeholder="Pega el contenido del CAF (XML del SII)…"
          rows={5}
          className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={busy || !xml.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? "Validando…" : "Subir CAF"}
        </button>
      </form>
    </section>
  );
}

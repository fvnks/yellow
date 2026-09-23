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
      <h2 className="text-lg font-semibold text-ink">
        CAF — folios autorizados
      </h2>

      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {notice && <p className="alert alert-ok" role="status">{notice}</p>}

      {cafs.length > 0 ? (
        <ul className="space-y-2">
          {cafs.map((caf) => {
            const disponibles = Math.max(0, caf.folioHasta - caf.nextFolio + 1);
            return (
              <li
                key={caf.id}
                className="panel flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="text-ink">
                  Tipo {caf.tipoDte} · folios {caf.folioDesde}–{caf.folioHasta} ·
                  próximo {caf.nextFolio}
                </span>
                <span
                  className={
                    disponibles > 0 ? "font-medium text-ok" : "font-medium text-err"
                  }
                >
                  {disponibles} disponibles
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-ink-soft">
          Sin CAF todavía. Solicítalos en el SII y pega aquí el XML.
        </p>
      )}

      <form onSubmit={upload} className="space-y-2">
        <textarea
          value={xml}
          onChange={(e) => setXml(e.target.value)}
          aria-label="Contenido XML del CAF"
          placeholder="Pega el contenido del CAF (XML del SII)…"
          rows={5}
          className="field font-mono text-xs"
        />
        <button
          type="submit"
          disabled={busy || !xml.trim()}
          className="btn btn-primary"
        >
          {busy ? "Validando…" : "Subir CAF"}
        </button>
      </form>
    </section>
  );
}

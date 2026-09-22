"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Documento = {
  id: string;
  tipoDte: number;
  folio: number | null;
  fechaEmision: string;
  receptorRut: string;
  receptorRazonSocial: string;
  total: number;
  estado: string;
  trackId: string | null;
};

const TIPO_LABEL: Record<number, string> = {
  33: "Factura",
  34: "F. exenta",
  52: "Guía",
  46: "F. compra",
  56: "N. débito",
  61: "N. crédito",
};

const ESTADO_STYLES: Record<string, string> = {
  BORRADOR: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  FIRMADO: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  ENVIADO: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  ACEPTADO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  RECHAZADO: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  ANULADO: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const EMITIBLES = new Set(["BORRADOR", "FIRMADO"]);

export function DteList({
  tenantId,
  documentos,
}: {
  tenantId: string;
  documentos: Documento[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function emitir(documentoId: string) {
    setError(null);
    setNotice(null);
    setBusyId(documentoId);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/dte/${documentoId}/emitir`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo emitir el documento");
        return;
      }
      setNotice(
        `Emitido: folio ${data.resultado.folio} · ${data.resultado.estado} · track ${data.resultado.trackId}`,
      );
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        Documentos emitidos
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

      {documentos.length === 0 ? (
        <p className="text-sm text-zinc-500">Aún no hay documentos.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Folio</th>
                <th className="px-4 py-2 font-medium">Receptor</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Track</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                >
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {new Date(doc.fechaEmision).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-4 py-2">{TIPO_LABEL[doc.tipoDte] ?? doc.tipoDte}</td>
                  <td className="px-4 py-2 font-mono">{doc.folio ?? "—"}</td>
                  <td className="max-w-56 truncate px-4 py-2">
                    {doc.receptorRazonSocial}
                    <span className="ml-2 text-xs text-zinc-500">{doc.receptorRut}</span>
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {clp.format(doc.total)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${ESTADO_STYLES[doc.estado] ?? ""}`}
                    >
                      {doc.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-500">
                    {doc.trackId ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {EMITIBLES.has(doc.estado) && (
                      <button
                        onClick={() => emitir(doc.id)}
                        disabled={busyId === doc.id}
                        className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                      >
                        {busyId === doc.id ? "Emitiendo…" : "Emitir"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  metodosAnulacion,
  tipoNotaCompensatoria,
  type MetodoAnulacion,
} from "@/lib/dte/anulacion";

type Documento = {
  id: string;
  tipoDte: number;
  folio: number | null;
  fechaEmision: string;
  receptorRut: string | null;
  receptorRazonSocial: string | null;
  emisorRut: string | null;
  emisorRazonSocial: string | null;
  total: number;
  estado: string;
  trackId: string | null;
  /** Motivo de rechazo/error persistido por el SII (glosa o error de envío). */
  siiResponse: string | null;
  /** Detalle de la anulación (método + motivo), cuando el doc fue anulado. */
  motivoAnulacion: string | null;
  vendedor: { id: string; nombre: string } | null;
  costCenter: { id: string; codigo: string; nombre: string } | null;
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

const selectClass =
  "rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700";

/**
 * Document list for both senses. SALIDA shows estado/track + emit/delete-draft
 * actions; ENTRADA shows provider docs (deletable only by managers).
 */
export function DteList({
  tenantId,
  documentos,
  sentido = "SALIDA",
  canManage = false,
  vendedores = [],
}: {
  tenantId: string;
  documentos: Documento[];
  sentido?: "SALIDA" | "ENTRADA";
  canManage?: boolean;
  /** Options for the client-side "por vendedor" filter (ventas only). */
  vendedores?: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const esSalida = sentido === "SALIDA";
  const [busyId, setBusyId] = useState<string | null>(null);
  const [vendedorFilter, setVendedorFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [advertencia, setAdvertencia] = useState<string | null>(null);
  // ── Diálogo de anulación (NC automática o anulación directa) ──
  const [anulando, setAnulando] = useState<Documento | null>(null);
  const [anularMetodo, setAnularMetodo] = useState<MetodoAnulacion>("directa");
  const [anularMotivo, setAnularMotivo] = useState("");
  const [anularError, setAnularError] = useState<string | null>(null);

  const visibles = vendedorFilter
    ? documentos.filter((d) => d.vendedor?.id === vendedorFilter)
    : documentos;

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

  async function consultarEstado(documentoId: string) {
    setError(null);
    setNotice(null);
    setBusyId(documentoId);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/dte/${documentoId}/estado`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo consultar el estado");
        return;
      }
      setNotice(
        `SII: ${data.siiEstado}` +
          `${data.glosa ? ` — ${data.glosa}` : ""}` +
          `${data.actualizado ? " · documento actualizado" : " · sigue en revisión"}`,
      );
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function eliminar(documentoId: string) {
    if (!window.confirm("¿Eliminar este documento? Esta acción no se puede deshacer."))
      return;
    setError(null);
    setNotice(null);
    setBusyId(documentoId);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/dte/${documentoId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo eliminar el documento");
        return;
      }
      setNotice("Documento eliminado.");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  function abrirAnular(doc: Documento) {
    const permitidos = metodosAnulacion(doc.estado, doc.tipoDte);
    if (permitidos.length === 0) return;
    setAnularMetodo(permitidos.includes("nc") ? "nc" : "directa");
    setAnularMotivo("");
    setAnularError(null);
    setAnulando(doc);
  }

  function descargarCarta(carta: string, folio: number | null) {
    const url = URL.createObjectURL(
      new Blob([carta], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `carta-anulacion-${folio ?? "dte"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function anular() {
    if (!anulando) return;
    setAnularError(null);
    setBusyId(anulando.id);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/dte/${anulando.id}/anular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metodo: anularMetodo, motivo: anularMotivo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnularError(data.error ?? "No se pudo anular el documento");
        return;
      }
      if (data.carta) descargarCarta(data.carta, anulando.folio);
      setNotice(data.mensaje ?? "Documento anulado.");
      setAdvertencia(data.advertencia ?? null);
      setAnulando(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const puedeBorrar = (doc: Documento) =>
    esSalida ? doc.estado === "BORRADOR" : canManage;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          {esSalida ? "Documentos emitidos" : "Compras registradas"}
        </h2>
        {esSalida && vendedores.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            Vendedor
            <select
              value={vendedorFilter}
              onChange={(e) => setVendedorFilter(e.target.value)}
              className={selectClass}
            >
              <option value="">Todos</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

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
      {advertencia && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {advertencia}
        </p>
      )}

      {visibles.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {esSalida ? "Aún no hay documentos." : "Aún no hay compras."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Folio</th>
                <th className="px-4 py-2 font-medium">
                  {esSalida ? "Receptor" : "Proveedor"}
                </th>
                <th className="px-4 py-2 font-medium">Centro costo</th>
                {esSalida && (
                  <th className="px-4 py-2 font-medium">Vendedor</th>
                )}
                <th className="px-4 py-2 text-right font-medium">Total</th>
                {esSalida && (
                  <>
                    <th className="px-4 py-2 font-medium">Estado</th>
                    <th className="px-4 py-2 font-medium">Track</th>
                  </>
                )}
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((doc) => (
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
                    {esSalida ? doc.receptorRazonSocial : doc.emisorRazonSocial}
                    <span className="ml-2 text-xs text-zinc-500">
                      {esSalida ? doc.receptorRut : doc.emisorRut}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {doc.costCenter?.codigo ?? "—"}
                  </td>
                  {esSalida && (
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {doc.vendedor?.nombre ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-2 text-right font-medium">
                    {clp.format(doc.total)}
                  </td>
                  {esSalida && (
                    <>
                      <td className="px-4 py-2 align-top">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${ESTADO_STYLES[doc.estado] ?? ""}`}
                        >
                          {doc.estado}
                        </span>
                        {doc.siiResponse && (
                          <p
                            className={`mt-1 max-w-56 truncate text-xs ${
                              doc.estado === "RECHAZADO" || doc.estado === "FIRMADO"
                                ? "text-red-600 dark:text-red-400"
                                : "text-zinc-500 dark:text-zinc-400"
                            }`}
                            title={doc.siiResponse}
                          >
                            {doc.siiResponse}
                          </p>
                        )}
                        {doc.motivoAnulacion && (
                          <p
                            className="mt-1 max-w-56 truncate text-xs text-zinc-500 dark:text-zinc-400"
                            title={doc.motivoAnulacion}
                          >
                            {doc.motivoAnulacion}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-zinc-500">
                        {doc.trackId ?? "—"}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-2 text-right">
                    <span className="flex justify-end gap-2">
                      {esSalida && EMITIBLES.has(doc.estado) && (
                        <button
                          onClick={() => emitir(doc.id)}
                          disabled={busyId === doc.id}
                          className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                        >
                          {busyId === doc.id ? "Emitiendo…" : "Emitir"}
                        </button>
                      )}
                      {esSalida && doc.estado === "ENVIADO" && doc.trackId && (
                        <button
                          onClick={() => consultarEstado(doc.id)}
                          disabled={busyId === doc.id}
                          className="rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          {busyId === doc.id ? "Consultando…" : "Consultar estado"}
                        </button>
                      )}
                      {esSalida &&
                        canManage &&
                        metodosAnulacion(doc.estado, doc.tipoDte).length > 0 && (
                          <button
                            onClick={() => abrirAnular(doc)}
                            disabled={busyId === doc.id}
                            className="rounded-md border border-zinc-300 px-3 py-1 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-zinc-700 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            Anular
                          </button>
                        )}
                      {puedeBorrar(doc) && (
                        <button
                          onClick={() => eliminar(doc.id)}
                          disabled={busyId === doc.id}
                          className="rounded-md border border-zinc-300 px-3 py-1 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-zinc-700 dark:text-red-400 dark:hover:bg-red-950"
                        >
                          Eliminar
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {anulando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Anular {TIPO_LABEL[anulando.tipoDte] ?? anulando.tipoDte} N°{" "}
                {anulando.folio ?? "—"}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                {anulando.receptorRazonSocial ?? anulando.receptorRut ?? ""} ·{" "}
                {clp.format(anulando.total)} · {anulando.estado}
              </p>
            </div>

            {(() => {
              const permitidos = metodosAnulacion(anulando.estado, anulando.tipoDte);
              if (permitidos.length === 0) return null;
              const notaTipo = tipoNotaCompensatoria(anulando.tipoDte);
              const opciones: Record<MetodoAnulacion, { label: string; desc: string }> = {
                nc: {
                  label: `Emitir ${notaTipo === 56 ? "N. débito (56)" : "N. crédito (61)"} automática`,
                  desc: "Crea y envía la nota que anula este documento (CodRef=1); el original queda ANULADO cuando el SII la procesa. Es el camino normal para documentos aceptados.",
                },
                directa:
                  anulando.estado === "FIRMADO"
                    ? {
                        label: "Anular folio ante el SII",
                        desc: "Documento firmado y NO enviado: se informa la nulidad del folio al SII (con .p12 activo la llamada es real; hoy, simulada).",
                      }
                    : anulando.tipoDte === 52
                      ? {
                          label: "Anulación directa (guía)",
                          desc: "El SII no exige informar guías de despacho: sólo queda registrada para el Libro de Guías.",
                        }
                      : {
                          label: "Carta de anulación al SII",
                          desc: "Genera la carta para presentar ante el SII y marca el documento ANULADO. Para casos excepcionales: el camino habitual es la nota de crédito.",
                        },
              };
              if (permitidos.length === 1) {
                const unica = opciones[permitidos[0]];
                return (
                  <p className="rounded-md bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {unica.label}.
                    </span>{" "}
                    {unica.desc}
                  </p>
                );
              }
              return (
                <fieldset className="space-y-2">
                  <legend className="text-xs font-medium text-zinc-500">
                    Método de anulación
                  </legend>
                  {permitidos.map((m) => (
                    <label
                      key={m}
                      className="flex cursor-pointer gap-2 rounded-md border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
                    >
                      <input
                        type="radio"
                        name="metodo-anulacion"
                        checked={anularMetodo === m}
                        onChange={() => setAnularMetodo(m)}
                        className="mt-0.5 accent-red-600"
                      />
                      <span>
                        <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          {opciones[m].label}
                        </span>
                        <span className="mt-0.5 block text-xs text-zinc-500">
                          {opciones[m].desc}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              );
            })()}

            <label className="block space-y-1 text-xs font-medium text-zinc-500">
              Motivo (máx. 90 caracteres)
              <textarea
                value={anularMotivo}
                onChange={(e) => setAnularMotivo(e.target.value)}
                maxLength={90}
                rows={2}
                placeholder="Ej.: error en los datos del receptor"
                className="w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700 dark:text-zinc-100"
              />
            </label>

            {anularError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                {anularError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAnulando(null)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={anular}
                disabled={busyId === anulando.id || anularMotivo.trim().length < 5}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {busyId === anulando.id ? "Anulando…" : "Anular documento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

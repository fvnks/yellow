"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  metodosAnulacion,
  tipoNotaCompensatoria,
  type MetodoAnulacion,
} from "@/lib/dte/anulacion";
import type { DimensionOption } from "./dte-form";

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
  /** true → el DTE firmado está en Yellow y su XML es descargable. */
  xmlDisponible: boolean;
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
  BORRADOR: "chip chip-muted",
  FIRMADO: "chip chip-blue",
  ENVIADO: "chip chip-orange",
  ACEPTADO: "chip chip-ok",
  RECHAZADO: "chip chip-err",
  ANULADO: "chip chip-muted",
};

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const EMITIBLES = new Set(["BORRADOR", "FIRMADO"]);

const selectClass = "field w-auto px-2 py-1 text-xs";

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
  centros = [],
  categorias = [],
}: {
  tenantId: string;
  documentos: Documento[];
  sentido?: "SALIDA" | "ENTRADA";
  canManage?: boolean;
  /** Options for the client-side "por vendedor" filter (ventas only). */
  vendedores?: { id: string; nombre: string }[];
  /** Opciones del diálogo Clasificar (compras): área y categoría. */
  centros?: DimensionOption[];
  categorias?: DimensionOption[];
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const anularOrigenRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (anulando) {
      requestAnimationFrame(() => dialogRef.current?.focus());
    } else {
      anularOrigenRef.current?.focus();
      anularOrigenRef.current = null;
    }
  }, [anulando]);
  // ── Diálogo de clasificación (área + categoría de una compra) ──
  const [clasificando, setClasificando] = useState<Documento | null>(null);
  const clasifDialogRef = useRef<HTMLDivElement>(null);
  const clasifOrigenRef = useRef<HTMLElement | null>(null);
  const [clasifCentro, setClasifCentro] = useState("");
  const [clasifCategoria, setClasifCategoria] = useState("");
  const [clasifBusy, setClasifBusy] = useState(false);
  const [clasifError, setClasifError] = useState<string | null>(null);

  useEffect(() => {
    if (clasificando) {
      requestAnimationFrame(() => clasifDialogRef.current?.focus());
    } else {
      clasifOrigenRef.current?.focus();
      clasifOrigenRef.current = null;
    }
  }, [clasificando]);
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

    /** Teclado de los diálogos: Esc cierra y Tab queda atrapado dentro. */
  function manejarTeclasDialogo(
    e: React.KeyboardEvent<HTMLDivElement>,
    ref: React.RefObject<HTMLDivElement | null>,
    cerrar: () => void,
  ) {
    if (e.key === "Escape") {
      cerrar();
      return;
    }
    if (e.key !== "Tab") return;
    const foco = ref.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea, select, a[href]',
    );
    if (!foco || foco.length === 0) return;
    const primero = foco[0];
    const ultimo = foco[foco.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

function abrirAnular(doc: Documento) {
    const permitidos = metodosAnulacion(doc.estado, doc.tipoDte);
    if (permitidos.length === 0) return;
    setAnularMetodo(permitidos.includes("nc") ? "nc" : "directa");
    setAnularMotivo("");
    setAnularError(null);
    anularOrigenRef.current = document.activeElement as HTMLElement | null;
    setAnulando(doc);
  }

  function abrirClasificar(doc: Documento) {
    clasifOrigenRef.current = document.activeElement as HTMLElement | null;
    setClasifCentro(doc.costCenter?.id ?? "");
    setClasifCategoria("");
    setClasifError(null);
    setClasificando(doc);
    // Trae la categoría actual: si todos los ítems comparten una, la muestra.
    fetch(`/api/tenants/${tenantId}/dte/${doc.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: {
          documento?: { items?: Array<{ categoryId: string | null }> };
        } | null) => {
          const items = data?.documento?.items ?? [];
          const ids = new Set(
            items
              .map((i) => i.categoryId)
              .filter((id): id is string => Boolean(id)),
          );
          if (ids.size === 1) {
            setClasifCategoria(items.find((i) => i.categoryId)?.categoryId ?? "");
          }
        },
      )
      .catch(() => {
        /* la categoría queda sin inicializar; el usuario elige igual */
      });
  }

  async function guardarClasificacion() {
    if (!clasificando) return;
    setClasifError(null);
    setClasifBusy(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/dte/${clasificando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          costCenterId: clasifCentro,
          categoriaId: clasifCategoria,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setClasifError(data.error ?? "No se pudo clasificar la compra");
        return;
      }
      setNotice("Compra clasificada.");
      setClasificando(null);
      router.refresh();
    } finally {
      setClasifBusy(false);
    }
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
        <h2 className="text-lg font-medium text-ink">
          {esSalida ? "Documentos emitidos" : "Compras registradas"}
        </h2>
        {esSalida && vendedores.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-ink-soft">
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

      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {notice && <p className="alert alert-ok" role="status">{notice}</p>}
      {advertencia && <p className="alert alert-warn" role="status">{advertencia}</p>}

      {visibles.length === 0 ? (
        <p className="text-sm text-ink-soft">
          {esSalida ? "Aún no hay documentos." : "Aún no hay compras."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Tipo</th>
                <th scope="col">Folio</th>
                <th scope="col">{esSalida ? "Receptor" : "Proveedor"}</th>
                <th scope="col">Centro costo</th>
                {esSalida && <th scope="col">Vendedor</th>}
                <th scope="col" className="text-right">Total</th>
                {esSalida && (
                  <>
                    <th scope="col">Estado</th>
                    <th scope="col">Track</th>
                  </>
                )}
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((doc) => (
                <tr key={doc.id}>
                  <td className="text-ink-soft">
                    {new Date(doc.fechaEmision).toLocaleDateString("es-CL")}
                  </td>
                  <td>{TIPO_LABEL[doc.tipoDte] ?? doc.tipoDte}</td>
                  <td className="font-mono">{doc.folio ?? "—"}</td>
                  <td className="max-w-56 truncate">
                    {esSalida ? doc.receptorRazonSocial : doc.emisorRazonSocial}
                    <span className="ml-2 text-xs text-ink-soft">
                      {esSalida ? doc.receptorRut : doc.emisorRut}
                    </span>
                  </td>
                  <td className="text-ink-soft">
                    {doc.costCenter?.codigo ?? "—"}
                  </td>
                  {esSalida && (
                    <td className="text-ink-soft">{doc.vendedor?.nombre ?? "—"}</td>
                  )}
                  <td className="text-right font-medium">
                    {clp.format(doc.total)}
                  </td>
                  {esSalida && (
                    <>
                      <td className="align-top">
                        <span
                          className={ESTADO_STYLES[doc.estado] ?? "chip chip-muted"}
                        >
                          {doc.estado}
                        </span>
                        {doc.siiResponse && (
                          <p
                            className={`mt-1 max-w-56 truncate text-xs ${
                              doc.estado === "RECHAZADO" || doc.estado === "FIRMADO"
                                ? "text-err"
                                : "text-ink-soft"
                            }`}
                            title={doc.siiResponse}
                          >
                            {doc.siiResponse}
                          </p>
                        )}
                        {doc.motivoAnulacion && (
                          <p
                            className="mt-1 max-w-56 truncate text-xs text-ink-soft"
                            title={doc.motivoAnulacion}
                          >
                            {doc.motivoAnulacion}
                          </p>
                        )}
                      </td>
                      <td className="font-mono text-xs text-ink-soft">
                        {doc.trackId ?? "—"}
                      </td>
                    </>
                  )}
                  <td className="text-right">
                    <span className="flex justify-end gap-2">
                      {doc.xmlDisponible && (
                        <a
                          href={`/api/tenants/${tenantId}/dte/${doc.id}/archivo?formato=xml`}
                          className="btn btn-ghost px-3 py-1 text-xs"
                          download={`dte-${doc.tipoDte}-${doc.folio ?? doc.id}.xml`}
                        >
                          XML
                        </a>
                      )}
                      {(doc.xmlDisponible || doc.folio != null) && (
                        <a
                          href={`/api/tenants/${tenantId}/dte/${doc.id}/archivo?formato=pdf`}
                          className="btn btn-ghost px-3 py-1 text-xs"
                          download={`dte-${doc.tipoDte}-${doc.folio ?? doc.id}.pdf`}
                        >
                          PDF
                        </a>
                      )}
                      {!esSalida && !doc.xmlDisponible && doc.folio != null && (
                        <span
                          className="px-3 py-1 text-xs text-ink-soft"
                          title="El XML del proveedor sólo lo sirve el portal del SII (Consulta de documentos); Yellow no lo almacena."
                        >
                          XML en el SII
                        </span>
                      )}
                      {esSalida && EMITIBLES.has(doc.estado) && (
                        <button
                          onClick={() => emitir(doc.id)}
                          disabled={busyId === doc.id}
                          className="btn btn-primary px-3 py-1 text-xs"
                        >
                          {busyId === doc.id ? "Emitiendo…" : "Emitir"}
                        </button>
                      )}
                      {esSalida && doc.estado === "ENVIADO" && doc.trackId && (
                        <button
                          onClick={() => consultarEstado(doc.id)}
                          disabled={busyId === doc.id}
                          className="btn btn-ghost px-3 py-1 text-xs"
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
                            className="btn btn-danger px-3 py-1 text-xs"
                          >
                            Anular
                          </button>
                        )}
                      {!esSalida && (
                        <button
                          onClick={() => abrirClasificar(doc)}
                          disabled={busyId === doc.id}
                          className="btn btn-ghost px-3 py-1 text-xs"
                        >
                          Clasificar
                        </button>
                      )}
                      {puedeBorrar(doc) && (
                        <button
                          onClick={() => eliminar(doc.id)}
                          disabled={busyId === doc.id}
                          className="btn btn-danger px-3 py-1 text-xs"
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
          ref={dialogRef}
          tabIndex={-1}
          onKeyDown={(e) =>
            manejarTeclasDialogo(e, dialogRef, () => setAnulando(null))
          }
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialogo-anular-titulo"
        >
          <div className="panel w-full max-w-lg space-y-4 p-5 shadow-xl">
            <div>
              <h3 id="dialogo-anular-titulo" className="text-base font-semibold text-ink">
                Anular {TIPO_LABEL[anulando.tipoDte] ?? anulando.tipoDte} N°{" "}
                {anulando.folio ?? "—"}
              </h3>
              <p className="mt-1 text-xs text-ink-soft">
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
                  <p className="rounded-md bg-block p-3 text-xs text-ink-soft">
                    <span className="font-medium text-ink">{unica.label}.</span>{" "}
                    {unica.desc}
                  </p>
                );
              }
              return (
                <fieldset className="space-y-2">
                  <legend className="text-xs font-medium text-ink-soft">
                    Método de anulación
                  </legend>
                  {permitidos.map((m) => (
                    <label
                      key={m}
                      className="flex cursor-pointer gap-2 rounded-md border border-line p-3 hover:bg-block"
                    >
                      <input
                        type="radio"
                        name="metodo-anulacion"
                        checked={anularMetodo === m}
                        onChange={() => setAnularMetodo(m)}
                        className="mt-0.5 accent-navy"
                      />
                      <span>
                        <span className="block text-sm font-medium text-ink">
                          {opciones[m].label}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-soft">
                          {opciones[m].desc}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              );
            })()}

            <label className="block space-y-1 text-xs font-medium text-ink-soft">
              Motivo (máx. 90 caracteres)
              <textarea
                value={anularMotivo}
                onChange={(e) => setAnularMotivo(e.target.value)}
                maxLength={90}
                rows={2}
                placeholder="Ej.: error en los datos del receptor"
                className="field text-sm"
              />
            </label>

            {anularError && (
              <p className="alert alert-error text-xs" role="alert">{anularError}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAnulando(null)}
                className="btn btn-ghost px-3 py-1.5 text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={anular}
                disabled={busyId === anulando.id || anularMotivo.trim().length < 5}
                className="btn bg-err px-3 py-1.5 text-xs font-medium text-white hover:bg-err/90"
              >
                {busyId === anulando.id ? "Anulando…" : "Anular documento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {clasificando && (
        <div
          ref={clasifDialogRef}
          tabIndex={-1}
          onKeyDown={(e) =>
            manejarTeclasDialogo(e, clasifDialogRef, () => setClasificando(null))
          }
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialogo-clasificar-titulo"
        >
          <div className="panel w-full max-w-md space-y-4 p-5 shadow-xl">
            <div>
              <h3
                id="dialogo-clasificar-titulo"
                className="text-base font-semibold text-ink"
              >
                Clasificar {TIPO_LABEL[clasificando.tipoDte] ?? clasificando.tipoDte} N°{" "}
                {clasificando.folio ?? "—"}
              </h3>
              <p className="mt-1 text-xs text-ink-soft">
                {clasificando.emisorRazonSocial ?? clasificando.emisorRut ?? ""} ·{" "}
                {clp.format(clasificando.total)}
              </p>
            </div>

            <label className="block space-y-1 text-xs font-medium text-ink-soft">
              Área (centro de costo)
              <select
                value={clasifCentro}
                onChange={(e) => setClasifCentro(e.target.value)}
                className="field text-sm"
              >
                <option value="">— Sin área —</option>
                {centros.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1 text-xs font-medium text-ink-soft">
              Categoría (se aplica a todos los ítems)
              <select
                value={clasifCategoria}
                onChange={(e) => setClasifCategoria(e.target.value)}
                className="field text-sm"
              >
                <option value="">— Sin categoría —</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-xs text-ink-soft">
              Guardar aplica exactamente lo que ves: si dejas Sin área o Sin
              categoría, la factura queda sin esa dimensión.
            </p>

            {clasifError && (
              <p className="alert alert-error text-xs" role="alert">
                {clasifError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setClasificando(null)}
                className="btn btn-ghost px-3 py-1.5 text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={guardarClasificacion}
                disabled={clasifBusy}
                className="btn btn-primary px-3 py-1.5 text-xs"
              >
                {clasifBusy ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

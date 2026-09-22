"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TIPOS: Record<number, string> = {
  33: "Factura (33)",
  34: "Factura exenta (34)",
  52: "Guía de despacho (52)",
  46: "Factura de compra (46)",
  56: "Nota de débito (56)",
  61: "Nota de crédito (61)",
};

const TRASLADOS: Record<number, string> = {
  1: "Venta",
  2: "Bonificación",
  3: "Devolución",
  4: "Traslado",
  5: "Muestra",
  6: "Consignación",
  7: "Otros",
};

const NOTA_TIPOS = [56, 61];

export type DimensionOption = { id: string; label: string };

type ItemRow = {
  nombre: string;
  cantidad: string;
  precio: string;
  descuento: string;
  afectoIva: boolean;
  categoryId: string;
};

type RefRow = { tipoDteRef: string; folioRef: string; motivo: string };

const EMPTY_ITEM: ItemRow = {
  nombre: "",
  cantidad: "1",
  precio: "",
  descuento: "0",
  afectoIva: true,
  categoryId: "",
};

/** Client-side preview; the server recomputes authoritatively. */
function previewTotals(tipo: number, rows: ItemRow[]) {
  const docExempt = tipo === 34;
  let neto = 0;
  let mntExe = 0;
  for (const row of rows) {
    const cantidad = Number(row.cantidad) || 0;
    const precio = Number(row.precio) || 0;
    const descuento = Number(row.descuento) || 0;
    const amount = Math.round(cantidad * precio) - descuento;
    if (docExempt || !row.afectoIva) mntExe += amount;
    else neto += amount;
  }
  const iva = docExempt || neto === 0 ? 0 : Math.round(neto * 0.19);
  return { neto, mntExe, iva, total: neto + mntExe + iva };
}

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700";

/**
 * Document form for both senses: SALIDA (own invoice, emitted through SII)
 * and ENTRADA (provider invoice, registered as a purchase).
 */
export function DteForm({
  tenantId,
  sentido = "SALIDA",
  vendedores = [],
  centros = [],
  categorias = [],
}: {
  tenantId: string;
  sentido?: "SALIDA" | "ENTRADA";
  vendedores?: DimensionOption[];
  centros?: DimensionOption[];
  categorias?: DimensionOption[];
}) {
  const router = useRouter();
  const esSalida = sentido === "SALIDA";
  const [tipo, setTipo] = useState(33);
  // ── SALIDA: customer ──
  const [receptorRut, setReceptorRut] = useState("");
  const [receptorRazonSocial, setReceptorRazonSocial] = useState("");
  const [receptorGiro, setReceptorGiro] = useState("");
  const [receptorComuna, setReceptorComuna] = useState("");
  const [tipoTraslado, setTipoTraslado] = useState(4);
  // ── ENTRADA: provider + provider's folio ──
  const [emisorRut, setEmisorRut] = useState("");
  const [emisorRazonSocial, setEmisorRazonSocial] = useState("");
  const [folio, setFolio] = useState("");
  const [fechaEmision, setFechaEmision] = useState("");
  // ── Commercial dimensions ──
  const [vendedorId, setVendedorId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ ...EMPTY_ITEM }]);
  const [refs, setRefs] = useState<RefRow[]>([
    { tipoDteRef: "33", folioRef: "", motivo: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const esNota = NOTA_TIPOS.includes(tipo);
  const totals = previewTotals(tipo, items);

  function setItem(index: number, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function setRef(index: number, patch: Partial<RefRow>) {
    setRefs((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        sentido,
        tipoDte: tipo,
        items: items.map((row) => ({
          nombre: row.nombre,
          cantidad: Number(row.cantidad),
          precioUnitario: Number(row.precio),
          descuento: Number(row.descuento) || 0,
          afectoIva: row.afectoIva,
          ...(row.categoryId ? { categoryId: row.categoryId } : {}),
        })),
      };
      if (fechaEmision) payload.fechaEmision = fechaEmision;
      if (vendedorId) payload.vendedorId = vendedorId;
      if (costCenterId) payload.costCenterId = costCenterId;
      if (esSalida) {
        payload.receptorRut = receptorRut;
        payload.receptorRazonSocial = receptorRazonSocial;
        if (receptorGiro) payload.receptorGiro = receptorGiro;
        if (receptorComuna) payload.receptorComuna = receptorComuna;
        if (tipo === 52) payload.tipoTraslado = tipoTraslado;
      } else {
        payload.emisorRut = emisorRut;
        payload.emisorRazonSocial = emisorRazonSocial;
        payload.folio = Number(folio);
      }
      if (esNota) {
        payload.references = refs.map((ref) => ({
          tipoDteRef: Number(ref.tipoDteRef),
          folioRef: Number(ref.folioRef),
          motivo: ref.motivo || undefined,
        }));
      }

      const res = await fetch(`/api/tenants/${tenantId}/dte`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.issues?.[0]?.message;
        setError(detail ? `${data.error}: ${detail}` : (data.error ?? "No se pudo crear"));
        return;
      }
      setNotice(
        esSalida
          ? `Documento creado (borrador, ${clp.format(data.documento.total)}). Emítelo desde la lista.`
          : `Compra registrada (${clp.format(data.documento.total)}).`,
      );
      setItems([{ ...EMPTY_ITEM }]);
      setReceptorRut("");
      setReceptorRazonSocial("");
      setReceptorGiro("");
      setReceptorComuna("");
      setEmisorRut("");
      setEmisorRazonSocial("");
      setFolio("");
      setFechaEmision("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        {esSalida ? "Nueva venta" : "Registrar compra"}
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

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Tipo</span>
            <select
              value={tipo}
              onChange={(e) => setTipo(Number(e.target.value))}
              className={inputClass}
            >
              {Object.entries(TIPOS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          {esSalida ? (
            <>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">RUT receptor</span>
                <input
                  required
                  value={receptorRut}
                  onChange={(e) => setReceptorRut(e.target.value)}
                  placeholder="12.345.678-5"
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">Razón social</span>
                <input
                  required
                  value={receptorRazonSocial}
                  onChange={(e) => setReceptorRazonSocial(e.target.value)}
                  placeholder="Cliente SpA"
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">Giro (opcional)</span>
                <input
                  value={receptorGiro}
                  onChange={(e) => setReceptorGiro(e.target.value)}
                  placeholder="Comercio"
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Comuna (opcional)
                </span>
                <input
                  value={receptorComuna}
                  onChange={(e) => setReceptorComuna(e.target.value)}
                  placeholder="Providencia"
                  className={inputClass}
                />
              </label>
              {tipo === 52 && (
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Indicador de traslado
                  </span>
                  <select
                    value={tipoTraslado}
                    onChange={(e) => setTipoTraslado(Number(e.target.value))}
                    className={inputClass}
                  >
                    {Object.entries(TRASLADOS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          ) : (
            <>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">
                  RUT proveedor
                </span>
                <input
                  required
                  value={emisorRut}
                  onChange={(e) => setEmisorRut(e.target.value)}
                  placeholder="76.543.210-3"
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Proveedor
                </span>
                <input
                  required
                  value={emisorRazonSocial}
                  onChange={(e) => setEmisorRazonSocial(e.target.value)}
                  placeholder="Proveedor Ltda"
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Folio del documento
                </span>
                <input
                  required
                  type="number"
                  min="1"
                  value={folio}
                  onChange={(e) => setFolio(e.target.value)}
                  placeholder="1234"
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Fecha (opcional)
                </span>
                <input
                  type="date"
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                  className={inputClass}
                />
              </label>
            </>
          )}

          {esSalida && vendedores.length > 0 && (
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Vendedor</span>
              <select
                value={vendedorId}
                onChange={(e) => setVendedorId(e.target.value)}
                className={inputClass}
              >
                <option value="">— Sin vendedor —</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {centros.length > 0 && (
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                Centro de costo
              </span>
              <select
                value={costCenterId}
                onChange={(e) => setCostCenterId(e.target.value)}
                className={inputClass}
              >
                <option value="">— Sin centro de costo —</option>
                {centros.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Ítems
            </span>
            <button
              type="button"
              onClick={() => setItems((rows) => [...rows, { ...EMPTY_ITEM }])}
              className="rounded-md border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              + Agregar ítem
            </button>
          </div>

          {items.map((row, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-lg border border-zinc-200 p-3 sm:grid-cols-[2fr_repeat(3,1fr)_1.2fr_auto_auto] dark:border-zinc-800"
            >
              <input
                required
                value={row.nombre}
                onChange={(e) => setItem(index, { nombre: e.target.value })}
                placeholder="Descripción"
                className={inputClass}
              />
              <input
                required
                type="number"
                step="0.001"
                min="0.001"
                value={row.cantidad}
                onChange={(e) => setItem(index, { cantidad: e.target.value })}
                placeholder="Cant."
                className={inputClass}
              />
              <input
                required
                type="number"
                step="1"
                min="0"
                value={row.precio}
                onChange={(e) => setItem(index, { precio: e.target.value })}
                placeholder="$ unitario"
                className={inputClass}
              />
              <input
                type="number"
                step="1"
                min="0"
                value={row.descuento}
                onChange={(e) => setItem(index, { descuento: e.target.value })}
                placeholder="$ desc."
                className={inputClass}
              />
              {categorias.length > 0 && (
                <select
                  value={row.categoryId}
                  onChange={(e) => setItem(index, { categoryId: e.target.value })}
                  className={inputClass}
                  aria-label="Categoría"
                >
                  <option value="">— Categoría —</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              )}
              <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={row.afectoIva}
                  onChange={(e) => setItem(index, { afectoIva: e.target.checked })}
                />
                Afecto IVA
              </label>
              <button
                type="button"
                onClick={() =>
                  setItems((rows) =>
                    rows.length > 1 ? rows.filter((_, i) => i !== index) : rows,
                  )
                }
                className="text-xs text-red-600 underline hover:text-red-800 dark:text-red-400"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>

        {esNota && (
          <div className="space-y-2">
            <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Documento de referencia (obligatorio)
            </span>
            {refs.map((ref, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-lg border border-dashed border-zinc-300 p-3 sm:grid-cols-4 dark:border-zinc-700"
              >
                <select
                  value={ref.tipoDteRef}
                  onChange={(e) => setRef(index, { tipoDteRef: e.target.value })}
                  className={inputClass}
                >
                  <option value="33">Factura (33)</option>
                  <option value="34">Factura exenta (34)</option>
                  <option value="46">Factura de compra (46)</option>
                  <option value="52">Guía (52)</option>
                </select>
                <input
                  required
                  type="number"
                  min="1"
                  value={ref.folioRef}
                  onChange={(e) => setRef(index, { folioRef: e.target.value })}
                  placeholder="Folio"
                  className={inputClass}
                />
                <input
                  value={ref.motivo}
                  onChange={(e) => setRef(index, { motivo: e.target.value })}
                  placeholder="Motivo (opcional)"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() =>
                    setRefs((rows) =>
                      rows.length > 1 ? rows.filter((_, i) => i !== index) : rows,
                    )
                  }
                  className="text-xs text-red-600 underline hover:text-red-800 dark:text-red-400"
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setRefs((rows) => [
                  ...rows,
                  { tipoDteRef: "33", folioRef: "", motivo: "" },
                ])
              }
              className="rounded-md border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              + Agregar referencia
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900">
          <div className="flex gap-4 text-zinc-600 dark:text-zinc-400">
            <span>Neto {clp.format(totals.neto)}</span>
            {totals.mntExe > 0 && <span>Exento {clp.format(totals.mntExe)}</span>}
            <span>IVA {clp.format(totals.iva)}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              Total {clp.format(totals.total)}
            </span>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {busy
                ? "Guardando…"
                : esSalida
                  ? "Crear borrador"
                  : "Registrar compra"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

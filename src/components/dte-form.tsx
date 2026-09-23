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

const inputClass = "field";

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
      <h2 className="text-lg font-medium text-ink">
        {esSalida ? "Nueva venta" : "Registrar compra"}
      </h2>

      {error && <p className="alert alert-error">{error}</p>}
      {notice && <p className="alert alert-ok">{notice}</p>}

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="text-ink">Tipo</span>
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
                <span className="text-ink">RUT receptor</span>
                <input
                  required
                  value={receptorRut}
                  onChange={(e) => setReceptorRut(e.target.value)}
                  placeholder="12.345.678-5"
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-ink">Razón social</span>
                <input
                  required
                  value={receptorRazonSocial}
                  onChange={(e) => setReceptorRazonSocial(e.target.value)}
                  placeholder="Cliente SpA"
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-ink">Giro (opcional)</span>
                <input
                  value={receptorGiro}
                  onChange={(e) => setReceptorGiro(e.target.value)}
                  placeholder="Comercio"
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-ink">Comuna (opcional)</span>
                <input
                  value={receptorComuna}
                  onChange={(e) => setReceptorComuna(e.target.value)}
                  placeholder="Providencia"
                  className={inputClass}
                />
              </label>
              {tipo === 52 && (
                <label className="space-y-1 text-sm">
                  <span className="text-ink">Indicador de traslado</span>
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
                <span className="text-ink">RUT proveedor</span>
                <input
                  required
                  value={emisorRut}
                  onChange={(e) => setEmisorRut(e.target.value)}
                  placeholder="76.543.210-3"
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-ink">Proveedor</span>
                <input
                  required
                  value={emisorRazonSocial}
                  onChange={(e) => setEmisorRazonSocial(e.target.value)}
                  placeholder="Proveedor Ltda"
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-ink">Folio del documento</span>
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
                <span className="text-ink">Fecha (opcional)</span>
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
              <span className="text-ink">Vendedor</span>
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
              <span className="text-ink">Centro de costo</span>
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
            <span className="text-sm font-medium text-ink">Ítems</span>
            <button
              type="button"
              onClick={() => setItems((rows) => [...rows, { ...EMPTY_ITEM }])}
              className="btn btn-ghost px-3 py-1 text-xs"
            >
              + Agregar ítem
            </button>
          </div>

          {items.map((row, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-[2fr_repeat(3,1fr)_1.2fr_auto_auto]"
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
              <label className="flex items-center gap-1.5 text-xs text-ink-soft">
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
                className="text-xs text-err underline hover:opacity-80"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>

        {esNota && (
          <div className="space-y-2">
            <span className="block text-sm font-medium text-ink">
              Documento de referencia (obligatorio)
            </span>
            {refs.map((ref, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-md border border-dashed border-line p-3 sm:grid-cols-4"
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
                  className="text-xs text-err underline hover:opacity-80"
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
              className="btn btn-ghost px-3 py-1 text-xs"
            >
              + Agregar referencia
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-block px-4 py-3 text-sm">
          <div className="flex gap-4 text-ink-soft">
            <span>Neto {clp.format(totals.neto)}</span>
            {totals.mntExe > 0 && <span>Exento {clp.format(totals.mntExe)}</span>}
            <span>IVA {clp.format(totals.iva)}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-medium text-ink">
              Total {clp.format(totals.total)}
            </span>
            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary px-4 py-2 text-sm"
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

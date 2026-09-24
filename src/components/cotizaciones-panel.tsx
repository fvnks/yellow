"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "@phosphor-icons/react";
import { etiquetaCotizacion, transicionValida, convertible } from "@/lib/dte/cotizacion";

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export type CotizacionRow = {
  id: string;
  numero: number;
  estado: string;
  receptorRut: string;
  receptorRazonSocial: string;
  fecha: string;
  validaHasta: string | null;
  comentario: string | null;
  vendedorId: string | null;
  costCenterId: string | null;
  neto: number;
  iva: number;
  total: number;
  dteId: string | null;
  items: Array<{ nombre: string; total: number }>;
};

type ItemRow = {
  nombre: string;
  cantidad: string;
  precio: string;
  descuento: string;
  categoryId: string;
};

const EMPTY_ITEM: ItemRow = {
  nombre: "",
  cantidad: "1",
  precio: "",
  descuento: "0",
  categoryId: "",
};

const ESTADO_CHIP: Record<string, string> = {
  BORRADOR: "chip chip-muted",
  ENVIADA: "chip chip-blue",
  ACEPTADA: "chip chip-ok",
  RECHAZADA: "chip chip-err",
  CONVERTIDA: "chip chip-navy",
};

const inputClass = "field";

/**
 * Cotizaciones del ERP: propuesta de venta con ítems, ciclo de vida
 * (borrador → enviada → aceptada/rechazada → convertida) y conversión a
 * factura en un clic (la venta nace BORRADOR, sin folio hasta emitir).
 */
export function CotizacionesPanel({
  tenantId,
  canManage,
  categorias,
  vendedores,
  centros,
  cotizacionesIniciales,
}: {
  tenantId: string;
  canManage: boolean;
  categorias: Array<{ id: string; label: string }>;
  vendedores: Array<{ id: string; label: string }>;
  centros: Array<{ id: string; label: string }>;
  cotizacionesIniciales: CotizacionRow[];
}) {
  const router = useRouter();
  const [cotizaciones, setCotizaciones] = useState<CotizacionRow[]>(cotizacionesIniciales);
  const [receptorRut, setReceptorRut] = useState("");
  const [receptorRazonSocial, setReceptorRazonSocial] = useState("");
  const [receptorGiro, setReceptorGiro] = useState("");
  const [receptorComuna, setReceptorComuna] = useState("");
  const [validaHasta, setValidaHasta] = useState("");
  const [comentario, setComentario] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ ...EMPTY_ITEM }]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);

  const neto = items.reduce((acc, row) => {
    const cantidad = Number(row.cantidad) || 0;
    const precio = Number(row.precio) || 0;
    const descuento = Number(row.descuento) || 0;
    return acc + Math.round(cantidad * precio) - descuento;
  }, 0);
  const iva = Math.round(neto * 0.19);

  function setItem(index: number, patch: Partial<ItemRow>) {
    setItems((rows) =>
      rows.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/cotizaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receptorRut,
          receptorRazonSocial,
          ...(receptorGiro ? { receptorGiro } : {}),
          ...(receptorComuna ? { receptorComuna } : {}),
          ...(validaHasta ? { validaHasta } : {}),
          ...(comentario ? { comentario } : {}),
          ...(vendedorId ? { vendedorId } : {}),
          ...(costCenterId ? { costCenterId } : {}),
          items: items.map((row) => ({
            nombre: row.nombre,
            cantidad: Number(row.cantidad),
            precioUnitario: Number(row.precio),
            descuento: Number(row.descuento) || 0,
            ...(row.categoryId ? { categoryId: row.categoryId } : {}),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.issues?.[0]?.message;
        setError(
          detail
            ? `${data.error}: ${detail}`
            : (data.error ?? "No se pudo crear la cotización"),
        );
        return;
      }
      setCotizaciones((prev) => [data.cotizacion, ...prev]);
      setNotice(`Cotización ${etiquetaCotizacion(data.cotizacion.numero)} creada (${clp.format(data.cotizacion.total)}).`);
      // Limpia al cliente; conserva ítems para cotizar rápido de nuevo.
      setReceptorRut("");
      setReceptorRazonSocial("");
      setReceptorGiro("");
      setReceptorComuna("");
      setValidaHasta("");
      setComentario("");
    } finally {
      setBusy(false);
    }
  }

  async function cambiarEstado(cot: CotizacionRow, estado: string) {
    setBusyId(cot.id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/cotizaciones/${cot.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo cambiar el estado");
        return;
      }
      setCotizaciones((prev) =>
        prev.map((c) => (c.id === cot.id ? data.cotizacion : c)),
      );
      setNotice(`Cotización ${etiquetaCotizacion(cot.numero)} ahora está ${estado.toLowerCase()}.`);
    } finally {
      setBusyId(null);
    }
  }

  async function convertirEnVenta(cot: CotizacionRow) {
    setBusyId(cot.id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/cotizaciones/${cot.id}/convertir`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo convertir la cotización");
        return;
      }
      setCotizaciones((prev) =>
        prev.map((c) => (c.id === cot.id ? data.cotizacion : c)),
      );
      setNotice(
        `Venta creada (borrador, ${clp.format(data.documento.total)}). Emítela desde ERP → Ventas.`,
      );
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function eliminar(cot: CotizacionRow) {
    setBusyId(cot.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/cotizaciones/${cot.id}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo eliminar la cotización");
        return;
      }
      setCotizaciones((prev) => prev.filter((c) => c.id !== cot.id));
      setNotice("Cotización eliminada.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-6">
      <button
        type="button"
        onClick={() => setFormAbierto((prev) => !prev)}
        className={
          formAbierto
            ? "btn btn-ghost px-4 py-2 text-sm"
            : "btn btn-primary px-4 py-2 text-sm"
        }
      >
        {formAbierto ? (
          <>
            <X size={16} weight="bold" aria-hidden />
            Cerrar
          </>
        ) : (
          <>
            <Plus size={16} weight="bold" aria-hidden />
            Nueva cotización
          </>
        )}
      </button>

      {formAbierto && (
      <form onSubmit={submit} className="panel space-y-4 p-6 shadow-sm shadow-navy/10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-ink">Nueva cotización</h2>
          <p className="text-xs text-ink-soft">
            Neto: {clp.format(neto)} · IVA: {clp.format(iva)} · Total:{" "}
            {clp.format(neto + iva)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="text-ink">RUT cliente</span>
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
          <label className="space-y-1 text-sm">
            <span className="text-ink">Válida hasta (opcional)</span>
            <input
              type="date"
              value={validaHasta}
              onChange={(e) => setValidaHasta(e.target.value)}
              className={inputClass}
            />
          </label>
          {vendedores.length > 0 && (
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
                <option value="">— Sin centro —</option>
                {centros.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="space-y-1 text-sm">
            <span className="text-ink">Comentario (opcional)</span>
            <input
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={500}
              placeholder="Condiciones, descuentos…"
              className={inputClass}
            />
          </label>
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
              className="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-[2fr_repeat(3,1fr)_1.2fr_auto]"
            >
              <input
                required
                value={row.nombre}
                onChange={(e) => setItem(index, { nombre: e.target.value })}
                placeholder="Descripción"
                aria-label="Descripción del ítem"
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
                aria-label="Cantidad"
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
                aria-label="Precio unitario"
                className={inputClass}
              />
              <input
                type="number"
                step="1"
                min="0"
                value={row.descuento}
                onChange={(e) => setItem(index, { descuento: e.target.value })}
                placeholder="$ desc."
                aria-label="Descuento"
                className={inputClass}
              />
              {categorias.length > 0 ? (
                <select
                  value={row.categoryId}
                  onChange={(e) => setItem(index, { categoryId: e.target.value })}
                  aria-label="Categoría"
                  className={inputClass}
                >
                  <option value="">—</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span />
              )}
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setItems((rows) => rows.filter((_, i) => i !== index))
                  }
                  className="btn btn-danger px-2 py-1 text-xs"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="alert alert-ok" role="status">
            {notice}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Creando…" : "Crear cotización"}
        </button>
      </form>
      )}

      <div className="space-y-3">
        {cotizaciones.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Todavía no hay cotizaciones registradas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">N°</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Fecha</th>
                  <th scope="col" className="text-right">Total</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Válida hasta</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {cotizaciones.map((cot) => (
                  <tr key={cot.id}>
                    <td className="whitespace-nowrap font-medium">
                      {etiquetaCotizacion(cot.numero)}
                    </td>
                    <td>
                      <span className="block font-medium">
                        {cot.receptorRazonSocial}
                      </span>
                      <span className="block text-xs text-ink-soft">
                        {cot.receptorRut}
                        {cot.comentario ? ` · ${cot.comentario}` : ""}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">{cot.fecha}</td>
                    <td className="text-right font-medium">
                      {clp.format(cot.total)}
                    </td>
                    <td>
                      <span className={ESTADO_CHIP[cot.estado] ?? "chip chip-muted"}>
                        {cot.estado}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-ink-soft">
                      {cot.validaHasta ?? "—"}
                    </td>
                    <td>
                      <span className="flex justify-end gap-1.5">
                        {transicionValida(
                          cot.estado as "BORRADOR",
                          "ENVIADA",
                        ) && (
                          <button
                            type="button"
                            onClick={() => cambiarEstado(cot, "ENVIADA")}
                            disabled={busyId === cot.id}
                            className="btn btn-ghost px-2.5 py-1 text-xs"
                          >
                            Enviar
                          </button>
                        )}
                        {transicionValida(
                          cot.estado as "BORRADOR",
                          "ACEPTADA",
                        ) && (
                          <button
                            type="button"
                            onClick={() => cambiarEstado(cot, "ACEPTADA")}
                            disabled={busyId === cot.id}
                            className="btn btn-ghost px-2.5 py-1 text-xs"
                          >
                            Aceptar
                          </button>
                        )}
                        {transicionValida(
                          cot.estado as "BORRADOR",
                          "RECHAZADA",
                        ) && (
                          <button
                            type="button"
                            onClick={() => cambiarEstado(cot, "RECHAZADA")}
                            disabled={busyId === cot.id}
                            className="btn btn-ghost px-2.5 py-1 text-xs"
                          >
                            Rechazar
                          </button>
                        )}
                        {convertible(cot.estado as "BORRADOR") && (
                          <button
                            type="button"
                            onClick={() => convertirEnVenta(cot)}
                            disabled={busyId === cot.id}
                            className="btn btn-primary px-2.5 py-1 text-xs"
                          >
                            {busyId === cot.id ? "…" : "→ Venta"}
                          </button>
                        )}
                        {cot.estado === "CONVERTIDA" && cot.dteId && (
                          <span className="px-2 py-1 text-xs text-ink-soft">
                            Venta creada
                          </span>
                        )}
                        {(cot.estado === "BORRADOR" || canManage) && (
                          <button
                            type="button"
                            onClick={() => eliminar(cot)}
                            disabled={busyId === cot.id}
                            className="btn btn-danger px-2.5 py-1 text-xs"
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
      </div>
    </section>
  );
}

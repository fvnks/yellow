"use client";

import { useState } from "react";
import { Plus, X } from "@phosphor-icons/react";

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export type GastoRow = {
  id: string;
  descripcion: string;
  monto: number;
  categoria: { id: string; nombre: string } | null;
  /** ISO AAAA-MM-DD */
  fecha: string;
  fechaReembolso: string | null;
  comentario: string | null;
  registradoPor: { nombre: string | null; email: string } | null;
};

function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Gastos de caja menor del ERP: registro con categoría y fecha, estado de
 * reembolso (pendiente / reembolsado) y lista con acciones. Cualquier
 * miembro registra; eliminar es de managers.
 */
export function GastosPanel({
  tenantId,
  canManage,
  categorias,
  gastosIniciales,
}: {
  tenantId: string;
  canManage: boolean;
  categorias: Array<{ id: string; label: string }>;
  gastosIniciales: GastoRow[];
}) {
  const [gastos, setGastos] = useState<GastoRow[]>(gastosIniciales);
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [fechaReembolso, setFechaReembolso] = useState("");
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);

  const total = gastos.reduce((acc, g) => acc + g.monto, 0);
  const pendiente = gastos
    .filter((g) => !g.fechaReembolso)
    .reduce((acc, g) => acc + g.monto, 0);
  const reembolsado = total - pendiente;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/gastos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descripcion,
          monto: Number(monto),
          categoriaId,
          fecha,
          ...(fechaReembolso ? { fechaReembolso } : {}),
          ...(comentario ? { comentario } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.issues?.[0]?.message;
        setError(
          detail ? `${data.error}: ${detail}` : (data.error ?? "No se pudo registrar el gasto"),
        );
        return;
      }
      setGastos((prev) => [data.gasto, ...prev]);
      setNotice(`Gasto registrado (${clp.format(data.gasto.monto)}).`);
      // Limpia lo que identifica al gasto; conserva categoría y fecha
      // para apilar varios del mismo día.
      setDescripcion("");
      setMonto("");
      setComentario("");
      setFechaReembolso("");
    } finally {
      setBusy(false);
    }
  }

  async function marcarReembolsado(gasto: GastoRow) {
    setBusyId(gasto.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/gastos/${gasto.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fechaReembolso: hoy() }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo marcar el reembolso");
        return;
      }
      setGastos((prev) => prev.map((g) => (g.id === gasto.id ? data.gasto : g)));
      setNotice("Gasto reembolsado.");
    } finally {
      setBusyId(null);
    }
  }

  async function eliminar(gasto: GastoRow) {
    setBusyId(gasto.id);
    setError(null);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/gastos/${gasto.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo eliminar el gasto");
        return;
      }
      setGastos((prev) => prev.filter((g) => g.id !== gasto.id));
      setNotice("Gasto eliminado.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="chip chip-muted">Total: {clp.format(total)}</span>
        <span className="chip chip-orange">Pendiente: {clp.format(pendiente)}</span>
        <span className="chip chip-ok">Reembolsado: {clp.format(reembolsado)}</span>
      </div>

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
            Nuevo gasto
          </>
        )}
      </button>

      {formAbierto && (
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="text-ink">Descripción</span>
            <input
              required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={120}
              placeholder="Taxi a reunión de cliente"
              className="field"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-ink">Monto</span>
            <input
              required
              type="number"
              min={1}
              step={1}
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="4500"
              className="field"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-ink">Categoría</span>
            <select
              required
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="field"
            >
              <option value="">— Elige —</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-ink">Fecha del gasto</span>
            <input
              required
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="field"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-ink">Fecha de reembolso (opcional)</span>
            <input
              type="date"
              value={fechaReembolso}
              onChange={(e) => setFechaReembolso(e.target.value)}
              className="field"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-ink">Comentario (opcional)</span>
            <input
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={500}
              placeholder="Detalle, con quién, qué se compró…"
              className="field"
            />
          </label>
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
          {busy ? "Registrando…" : "Registrar gasto"}
        </button>
      </form>
      )}

      <div className="space-y-3">
        {gastos.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Todavía no hay gastos registrados.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Descripción</th>
                  <th scope="col">Categoría</th>
                  <th scope="col">Registrado por</th>
                  <th scope="col" className="text-right">Monto</th>
                  <th scope="col">Reembolso</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {gastos.map((g) => (
                  <tr key={g.id}>
                    <td className="whitespace-nowrap">{g.fecha}</td>
                    <td>
                      <span className="block font-medium">{g.descripcion}</span>
                      {g.comentario && (
                        <span className="block text-xs text-ink-soft">
                          {g.comentario}
                        </span>
                      )}
                    </td>
                    <td>
                      {g.categoria ? (
                        <span className="chip chip-blue">{g.categoria.nombre}</span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                    <td className="text-ink-soft">
                      {g.registradoPor
                        ? (g.registradoPor.nombre ?? g.registradoPor.email)
                        : "—"}
                    </td>
                    <td className="text-right font-medium">{clp.format(g.monto)}</td>
                    <td>
                      {g.fechaReembolso ? (
                        <span className="chip chip-ok">Reembolsado {g.fechaReembolso}</span>
                      ) : (
                        <span className="chip chip-orange">Pendiente</span>
                      )}
                    </td>
                    <td>
                      <span className="flex justify-end gap-2">
                        {!g.fechaReembolso && (
                          <button
                            type="button"
                            onClick={() => marcarReembolsado(g)}
                            disabled={busyId === g.id}
                            className="btn btn-ghost px-3 py-1 text-xs"
                          >
                            {busyId === g.id ? "…" : "Marcar reembolsado"}
                          </button>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => eliminar(g)}
                            disabled={busyId === g.id}
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
      </div>
    </section>
  );
}

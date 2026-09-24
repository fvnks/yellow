"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeRut } from "@/lib/rut";
import type { DimensionOption } from "./dte-form";

/** Compras ya registradas — usado para avisar folios duplicados. */
export type CompraExistente = {
  rut: string | null;
  tipoDte: number;
  folio: number | null;
};

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

/**
 * Captura rápida de una factura de compra (papel o imagen): datos planos tal
 * como vienen impresos — proveedor, folio, monto, área y categoría. Envía un
 * único ítem sintético con la categoría por el POST /dte común (la compra
 * queda ACEPTADA, igual que el registro manual).
 */
export function CompraRapida({
  tenantId,
  centros = [],
  categorias = [],
  existentes = [],
}: {
  tenantId: string;
  centros?: DimensionOption[];
  categorias?: DimensionOption[];
  existentes?: CompraExistente[];
}) {
  const router = useRouter();
  const [rut, setRut] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [folio, setFolio] = useState("");
  const [fecha, setFecha] = useState("");
  const [tipo, setTipo] = useState<33 | 34>(33);
  const [monto, setMonto] = useState("");
  const [centroId, setCentroId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const exenta = tipo === 34;
  const neto = Number(monto) || 0;
  const iva = exenta ? 0 : Math.round(neto * 0.19);
  const categoriaNombre = categorias.find((c) => c.id === categoriaId)?.label;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    const dup = existentes.some(
      (x) =>
        x.folio != null &&
        x.folio === Number(folio) &&
        x.tipoDte === tipo &&
        x.rut &&
        normalizeRut(x.rut) === normalizeRut(rut),
    );
    if (dup && !confirmado) {
      setAviso(
        `Ya hay una factura ${tipo} N° ${folio} de este proveedor en tu lista. Si es distinta, presiona Registrar otra vez.`,
      );
      setConfirmado(true);
      return;
    }
    setAviso(null);
    setConfirmado(false);
    setBusy(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/dte`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentido: "ENTRADA",
          tipoDte: tipo,
          emisorRut: rut,
          emisorRazonSocial: razonSocial,
          folio: Number(folio),
          ...(fecha ? { fechaEmision: fecha } : {}),
          ...(centroId ? { costCenterId: centroId } : {}),
          items: [
            {
              nombre: categoriaNombre ? `Compra: ${categoriaNombre}` : "Compra rápida",
              cantidad: 1,
              precioUnitario: neto,
              descuento: 0,
              afectoIva: !exenta,
              ...(categoriaId ? { categoryId: categoriaId } : {}),
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.issues?.[0]?.message;
        setError(
          detail
            ? `${data.error}: ${detail}`
            : (data.error ?? "No se pudo registrar la compra"),
        );
        return;
      }
      setError(null);
      setNotice(`Compra registrada (${clp.format(data.documento.total)}).`);
      // Limpia lo que identifica a la factura; conserva tipo/área/categoría
      // para registrar varias facturas seguidas del mismo gasto.
      setRut("");
      setRazonSocial("");
      setFolio("");
      setFecha("");
      setMonto("");
      setConfirmado(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-sm">
          <span className="text-ink">Tipo</span>
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(Number(e.target.value) as 33 | 34);
              setConfirmado(false);
            }}
            className="field"
          >
            <option value={33}>Factura (33)</option>
            <option value={34}>Factura exenta (34)</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-ink">RUT proveedor</span>
          <input
            required
            value={rut}
            onChange={(e) => {
              setRut(e.target.value);
              setConfirmado(false);
            }}
            placeholder="76.543.210-3"
            className="field"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-ink">Proveedor</span>
          <input
            required
            value={razonSocial}
            onChange={(e) => setRazonSocial(e.target.value)}
            placeholder="Proveedor Ltda"
            className="field"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-ink">N° de factura</span>
          <input
            required
            type="number"
            min={1}
            value={folio}
            onChange={(e) => {
              setFolio(e.target.value);
              setConfirmado(false);
            }}
            placeholder="1234"
            className="field"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-ink">Fecha (opcional)</span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="field"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-ink">{exenta ? "Monto exento" : "Monto neto"}</span>
          <input
            required
            type="number"
            min={1}
            step={1}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="50000"
            className="field"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-ink">Área (centro de costo)</span>
          <select
            value={centroId}
            onChange={(e) => setCentroId(e.target.value)}
            className="field"
          >
            <option value="">— Sin área —</option>
            {centros.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-ink">Categoría de compra</span>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="field"
          >
            <option value="">— Sin categoría —</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm text-ink-soft">
        {neto > 0
          ? exenta
            ? `Factura exenta · Total: ${clp.format(neto)}`
            : `IVA (19%): ${clp.format(iva)} · Total: ${clp.format(neto + iva)}`
          : exenta
            ? "Factura exenta de IVA: ingresa el monto total."
            : "Ingresa el monto neto de la factura; el IVA (19%) se calcula solo."}
      </p>

      {aviso && (
        <p className="alert alert-warn" role="status">
          {aviso}
        </p>
      )}
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
        {busy ? "Registrando…" : "Registrar compra"}
      </button>
    </form>
  );
}

import { redirect } from "next/navigation";
import { canManageTenant } from "@/lib/authz";
import { db } from "@/lib/db";
import { modulosActivos } from "@/lib/modules";
import { getAuthContext } from "@/lib/session";
import { CotizacionesPanel } from "@/components/cotizaciones-panel";

export const dynamic = "force-dynamic";

/**
 * Sección Cotizaciones del módulo ERP: propuestas de venta con ciclo de
 * vida (borrador → enviada → aceptada/rechazada → convertida) y conversión
 * a factura en un clic.
 */
export default async function CotizacionesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const active = ctx.memberships.find(
    (m) => m.tenantId === ctx.session.activeTenantId,
  );
  if (!active) redirect("/dashboard");

  const tenantId = active.tenantId;
  const canManage = canManageTenant(ctx, tenantId);

  const activos = await modulosActivos(tenantId);
  if (!activos.has("ERP")) redirect("/dashboard");

  const [vendedores, centros, categorias, cotizaciones] = await Promise.all([
    db.vendedor.findMany({
      where: { tenantId, activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    db.centroCosto.findMany({
      where: { tenantId, activo: true },
      orderBy: { codigo: "asc" },
      select: { id: true, codigo: true, nombre: true },
    }),
    db.categoria.findMany({
      where: { tenantId, activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    db.cotizacion.findMany({
      where: { tenantId },
      orderBy: [{ createdAt: "desc" }],
      include: { items: { orderBy: { linea: "asc" } } },
    }),
  ]);

  const iso = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Cotizaciones</h1>
          <p className="text-sm text-ink-soft">
            Propuestas de venta de {active.tenant.name} · al aceptar,
            conviértelas en factura con un clic
          </p>
        </div>
      </header>

      <CotizacionesPanel
        tenantId={tenantId}
        canManage={canManage}
        categorias={categorias.map((c) => ({ id: c.id, label: c.nombre }))}
        vendedores={vendedores.map((v) => ({ id: v.id, label: v.nombre }))}
        centros={centros.map((c) => ({
          id: c.id,
          label: `${c.codigo} · ${c.nombre}`,
        }))}
        cotizacionesIniciales={cotizaciones.map((cot) => ({
          id: cot.id,
          numero: cot.numero,
          estado: cot.estado,
          receptorRut: cot.receptorRut,
          receptorRazonSocial: cot.receptorRazonSocial,
          fecha: iso(cot.fecha),
          validaHasta: cot.validaHasta ? iso(cot.validaHasta) : null,
          comentario: cot.comentario,
          vendedorId: cot.vendedorId,
          costCenterId: cot.costCenterId,
          neto: cot.neto,
          iva: cot.iva,
          total: cot.total,
          dteId: cot.dteId,
          items: cot.items.map((i) => ({ nombre: i.nombre, total: i.total })),
        }))}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { canManageTenant } from "@/lib/authz";
import { db } from "@/lib/db";
import { modulosActivos } from "@/lib/modules";
import { getAuthContext } from "@/lib/session";
import { GastosPanel } from "@/components/gastos-panel";

export const dynamic = "force-dynamic";

/**
 * Sección Gastos del módulo ERP: caja menor y rendiciones reembolsables,
 * clasificadas con el maestro de categorías.
 */
export default async function GastosPage() {
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

  const [categorias, gastos] = await Promise.all([
    db.categoria.findMany({
      where: { tenantId, activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    db.gasto.findMany({
      where: { tenantId },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        categoria: { select: { id: true, nombre: true } },
        registradoPor: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Gastos</h1>
          <p className="text-sm text-ink-soft">
            Caja menor y rendiciones de {active.tenant.name} · sin fecha de
            reembolso queda pendiente
          </p>
        </div>
      </header>

      <GastosPanel
        tenantId={tenantId}
        canManage={canManage}
        categorias={categorias.map((c) => ({ id: c.id, label: c.nombre }))}
        gastosIniciales={gastos.map((g) => ({
          id: g.id,
          descripcion: g.descripcion,
          monto: g.monto,
          categoria: g.categoria,
          fecha: g.fecha.toISOString().slice(0, 10),
          fechaReembolso: g.fechaReembolso?.toISOString().slice(0, 10) ?? null,
          comentario: g.comentario,
          registradoPor: g.registradoPor
            ? { nombre: g.registradoPor.name, email: g.registradoPor.email }
            : null,
        }))}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { canManageTenant } from "@/lib/authz";
import { MODULOS, modulosActivos, type ModuloKey } from "@/lib/modules";
import { getAuthContext } from "@/lib/session";
import { ModuleLauncher } from "@/components/module-launcher";

export const dynamic = "force-dynamic";

/** Portal: solo las cajas de los módulos. Entrar a un módulo es ir a su área. */
export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const active = ctx.memberships.find(
    (m) => m.tenantId === ctx.session.activeTenantId,
  );

  const tenantId = active?.tenantId ?? null;
  const canManage = tenantId ? canManageTenant(ctx, tenantId) : false;
  const activos = tenantId
    ? await modulosActivos(tenantId)
    : new Set<ModuloKey>();

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold text-ink">Panel</h1>
        <p className="text-sm text-ink-soft">
          {active
            ? `${active.tenant.name} · elige un módulo para entrar`
            : "Aún no perteneces a ningún tenant."}
        </p>
      </section>

      {tenantId && (
        <ModuleLauncher
          tenantId={tenantId}
          canManage={canManage}
          modulos={MODULOS.map((m) => ({ ...m, activo: activos.has(m.key) }))}
        />
      )}
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageTenant } from "@/lib/authz";
import { modulosActivos } from "@/lib/modules";
import { getAuthContext } from "@/lib/session";
import { ErpCompras } from "@/components/erp-compras";
import { ErpVentas } from "@/components/erp-ventas";

export const dynamic = "force-dynamic";

/**
 * Módulo ERP: ventas (emisión de DTE) y compras (registro de proveedores)
 * encapsulados en una sola página con un toggle de sentido, igual que el
 * Libro. La autenticación y el módulo activo se validan una sola vez.
 */
export default async function ErpPage({
  searchParams,
}: {
  searchParams: Promise<{ sentido?: string }>;
}) {
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

  const params = await searchParams;
  const sentido = params.sentido === "ENTRADA" ? "ENTRADA" : "SALIDA";

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">ERP</h1>
          <p className="text-sm text-ink-soft">
            Ventas y compras de {active.tenant.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2">
            <Link
              href="/erp?sentido=SALIDA"
              className={sentido === "SALIDA" ? "btn btn-primary" : "btn btn-ghost"}
            >
              Ventas
            </Link>
            <Link
              href="/erp?sentido=ENTRADA"
              className={sentido === "ENTRADA" ? "btn btn-primary" : "btn btn-ghost"}
            >
              Compras
            </Link>
          </div>
          <Link href="/dashboard" className="btn btn-ghost">
            ← Panel
          </Link>
        </div>
      </header>

      {sentido === "SALIDA" ? (
        <ErpVentas tenantId={tenantId} canManage={canManage} />
      ) : (
        <ErpCompras tenantId={tenantId} canManage={canManage} />
      )}
    </div>
  );
}

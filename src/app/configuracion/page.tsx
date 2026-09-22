import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageTenant } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { MasterDataPanel } from "@/components/master-data-panel";
import { ModuleNav } from "@/components/module-nav";

export const dynamic = "force-dynamic";

/** Master data (vendedores, centros de costo, categorías). OWNER/ADMIN only. */
export default async function ConfiguracionPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const active = ctx.memberships.find(
    (m) => m.tenantId === ctx.session.activeTenantId,
  );
  if (!active) redirect("/dashboard");

  const tenantId = active.tenantId;
  if (!canManageTenant(ctx, tenantId)) redirect("/dashboard");

  const [vendedores, centros, categorias] = await Promise.all([
    db.vendedor.findMany({
      where: { tenantId },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    }),
    db.centroCosto.findMany({
      where: { tenantId },
      orderBy: [{ activo: "desc" }, { codigo: "asc" }],
    }),
    db.categoria.findMany({
      where: { tenantId },
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Configuración comercial
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Vendedores, centros de costo y categorías de {active.tenant.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModuleNav active="configuracion" />
          <Link
            href="/dashboard"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← Panel
          </Link>
        </div>
      </header>

      <MasterDataPanel
        tenantId={tenantId}
        apiPath="vendedores"
        itemNoun="vendedor"
        title="Vendedores"
        hint="Catálogo comercial: no necesitan cuenta en Yellow. Desactivar conserva el histórico."
        fields={[
          { key: "nombre", label: "Nombre", placeholder: "Ana Pérez" },
          { key: "email", label: "Email (opcional)", type: "email" },
        ]}
        items={vendedores.map((v) => ({
          id: v.id,
          nombre: v.nombre,
          email: v.email ?? "",
          activo: v.activo,
        }))}
      />

      <hr className="border-zinc-200 dark:border-zinc-800" />

      <MasterDataPanel
        tenantId={tenantId}
        apiPath="centros-costo"
        itemNoun="centro de costo"
        title="Centros de costo"
        hint="Se asigna uno por documento (venta o compra). El código es único y no se puede cambiar."
        fields={[
          { key: "codigo", label: "Código", placeholder: "ADM" },
          { key: "nombre", label: "Nombre", placeholder: "Administración" },
        ]}
        items={centros.map((c) => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          activo: c.activo,
        }))}
      />

      <hr className="border-zinc-200 dark:border-zinc-800" />

      <MasterDataPanel
        tenantId={tenantId}
        apiPath="categorias"
        itemNoun="categoría"
        title="Categorías"
        hint="A nivel de ítem: producto/servicio en ventas, tipo de gasto en compras."
        fields={[{ key: "nombre", label: "Nombre", placeholder: "Insumos" }]}
        items={categorias.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          activo: c.activo,
        }))}
      />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageTenant } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { DteForm } from "@/components/dte-form";
import { DteList } from "@/components/dte-list";
import { ModuleNav } from "@/components/module-nav";

export const dynamic = "force-dynamic";

export default async function ComprasPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const active = ctx.memberships.find(
    (m) => m.tenantId === ctx.session.activeTenantId,
  );
  if (!active) redirect("/dashboard");

  const tenantId = active.tenantId;
  const canManage = canManageTenant(ctx, tenantId);

  const [documentos, centros, categorias] = await Promise.all([
    db.dteDocument.findMany({
      where: { tenantId, sentido: "ENTRADA" },
      orderBy: [{ fechaEmision: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        vendedor: { select: { id: true, nombre: true } },
        costCenter: { select: { id: true, codigo: true, nombre: true } },
      },
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

  const centroOptions = centros
    .filter((c) => c.activo)
    .map((c) => ({ id: c.id, label: `${c.codigo} · ${c.nombre}` }));
  const categoriaOptions = categorias
    .filter((c) => c.activo)
    .map((c) => ({ id: c.id, label: c.nombre }));

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Compras
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Facturas recibidas de proveedores ·{" "}
            <span className="text-zinc-500">
              la descarga automática desde el SII llega con la certificación
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModuleNav active="compras" hideConfig={!canManage} />
          <Link
            href="/dashboard"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← Panel
          </Link>
        </div>
      </header>

      <DteForm
        tenantId={tenantId}
        sentido="ENTRADA"
        centros={centroOptions}
        categorias={categoriaOptions}
      />

      <DteList
        tenantId={tenantId}
        sentido="ENTRADA"
        canManage={canManage}
        documentos={documentos.map((d) => ({
          id: d.id,
          tipoDte: d.tipoDte,
          folio: d.folio,
          fechaEmision: d.fechaEmision.toISOString(),
          receptorRut: d.receptorRut,
          receptorRazonSocial: d.receptorRazonSocial,
          emisorRut: d.emisorRut,
          emisorRazonSocial: d.emisorRazonSocial,
          total: d.total,
          estado: d.estado,
          trackId: d.trackId,
          siiResponse: d.siiResponse,
          motivoAnulacion: d.motivoAnulacion,
          vendedor: d.vendedor,
          costCenter: d.costCenter,
        }))}
      />
    </div>
  );
}

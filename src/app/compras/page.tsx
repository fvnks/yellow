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
          <h1 className="text-2xl font-semibold text-ink">Compras</h1>
          <p className="text-sm text-ink-soft">
            Facturas recibidas de proveedores · cada fila descarga su XML y
            PDF ·{" "}
            <Link
              href="/libros?sentido=ENTRADA"
              className="text-blue hover:underline"
            >
              registro CSV en Libros
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModuleNav active="compras" hideConfig={!canManage} />
          <Link href="/dashboard" className="btn btn-ghost">
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
          xmlDisponible: Boolean(d.xml),
          vendedor: d.vendedor,
          costCenter: d.costCenter,
        }))}
      />
    </div>
  );
}

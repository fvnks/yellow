import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageTenant } from "@/lib/authz";
import { db } from "@/lib/db";
import { resumenPorDimension } from "@/lib/dte/resumen";
import { modulosActivos } from "@/lib/modules";
import { getAuthContext } from "@/lib/session";
import { DteForm } from "@/components/dte-form";
import { DteList } from "@/components/dte-list";
import { ModuleNav } from "@/components/module-nav";

export const dynamic = "force-dynamic";

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export default async function ComprasPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const active = ctx.memberships.find(
    (m) => m.tenantId === ctx.session.activeTenantId,
  );
  if (!active) redirect("/dashboard");

  const tenantId = active.tenantId;
  const canManage = canManageTenant(ctx, tenantId);

  const activos = await modulosActivos(tenantId);
  if (!activos.has("COMPRAS")) redirect("/dashboard");

  const [documentos, centros, categorias, resumenAreaRaw, resumenCatRaw] =
    await Promise.all([
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
      // Spend grouped by cost center (área) over all purchases.
      db.dteDocument.groupBy({
        by: ["costCenterId"],
        where: { tenantId, sentido: "ENTRADA" },
        _sum: { total: true },
        _count: { _all: true },
      }),
      // Spend by category: categories live on items (one invoice may carry
      // several), so the count here is items, not documents.
      db.dteItem.groupBy({
        by: ["categoryId"],
        where: { document: { tenantId, sentido: "ENTRADA" } },
        _sum: { total: true },
        _count: { _all: true },
      }),
    ]);

  const centroOptions = centros
    .filter((c) => c.activo)
    .map((c) => ({ id: c.id, label: `${c.codigo} · ${c.nombre}` }));
  const categoriaOptions = categorias
    .filter((c) => c.activo)
    .map((c) => ({ id: c.id, label: c.nombre }));

  const centroName = new Map(
    centros.map((c) => [c.id, `${c.codigo} · ${c.nombre}`]),
  );
  const categoriaName = new Map(categorias.map((c) => [c.id, c.nombre]));
  const resumenArea = resumenPorDimension(
    resumenAreaRaw.map((g) => ({
      id: g.costCenterId,
      docs: g._count._all,
      total: g._sum.total ?? 0,
    })),
    centroName,
    "Sin área",
  );
  const resumenCategoria = resumenPorDimension(
    resumenCatRaw.map((g) => ({
      id: g.categoryId,
      docs: g._count._all,
      total: g._sum.total ?? 0,
    })),
    categoriaName,
    "Sin categoría",
  );

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
          <ModuleNav
            active="compras"
            activos={[...activos]}
            hideConfig={!canManage}
          />
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
        existentes={documentos.map((d) => ({
          rut: d.emisorRut,
          tipoDte: d.tipoDte,
          folio: d.folio,
        }))}
      />

      <DteList
        tenantId={tenantId}
        sentido="ENTRADA"
        canManage={canManage}
        centros={centroOptions}
        categorias={categoriaOptions}
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

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-ink">Gasto por área</h2>
        {resumenArea.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Todavía no hay compras registradas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Área (centro de costo)</th>
                  <th scope="col" className="text-right">Docs</th>
                  <th scope="col" className="text-right">Total compras</th>
                </tr>
              </thead>
              <tbody>
                {resumenArea.map((r) => (
                  <tr key={r.nombre}>
                    <td>{r.nombre}</td>
                    <td className="text-right text-ink-soft">{r.docs}</td>
                    <td className="text-right font-medium">
                      {clp.format(r.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-ink">Gasto por categoría</h2>
        {resumenCategoria.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Todavía no hay compras registradas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Categoría de compra</th>
                  <th scope="col" className="text-right">Ítems</th>
                  <th scope="col" className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {resumenCategoria.map((r) => (
                  <tr key={r.nombre}>
                    <td>{r.nombre}</td>
                    <td className="text-right text-ink-soft">{r.docs}</td>
                    <td className="text-right font-medium">
                      {clp.format(r.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

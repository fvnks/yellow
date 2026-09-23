import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageTenant } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { formatRut } from "@/lib/rut";
import { siiAmbiente } from "@/lib/sii/client";
import { CafsPanel } from "@/components/cafs-panel";
import { CertificadosPanel } from "@/components/certificados-panel";
import { DteForm } from "@/components/dte-form";
import { DteList } from "@/components/dte-list";
import { EmisorForm } from "@/components/emisor-form";
import { ModuleNav } from "@/components/module-nav";

export const dynamic = "force-dynamic";

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export default async function FacturacionPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const active = ctx.memberships.find(
    (m) => m.tenantId === ctx.session.activeTenantId,
  );
  if (!active) redirect("/dashboard");

  const tenantId = active.tenantId;
  const canManage = canManageTenant(ctx, tenantId);

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) redirect("/dashboard");

  const [documentos, vendedores, centros, categorias, cafs, certificates, resumenRaw] =
    await Promise.all([
      db.dteDocument.findMany({
        where: { tenantId, sentido: "SALIDA" },
        orderBy: [{ fechaEmision: "desc" }, { createdAt: "desc" }],
        take: 100,
        include: {
          vendedor: { select: { id: true, nombre: true } },
          costCenter: { select: { id: true, codigo: true, nombre: true } },
        },
      }),
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
      canManage
        ? db.caf.findMany({
            where: { tenantId },
            orderBy: [{ tipoDte: "asc" }, { folioDesde: "asc" }],
          })
        : Promise.resolve([]),
      db.siiCertificate.findMany({
        where: { tenantId },
        orderBy: [{ active: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          nombre: true,
          subject: true,
          rut: true,
          notBefore: true,
          notAfter: true,
          active: true,
        },
      }),
      // Sales grouped by vendedor (all senses' totals are CLP integers).
      db.dteDocument.groupBy({
        by: ["vendedorId"],
        where: { tenantId, sentido: "SALIDA" },
        _sum: { total: true },
        _count: { _all: true },
      }),
    ]);

  const vendedorName = new Map(vendedores.map((v) => [v.id, v.nombre]));
  const resumen = resumenRaw
    .map((r) => ({
      nombre: r.vendedorId
        ? (vendedorName.get(r.vendedorId) ?? "Vendedor eliminado")
        : "Sin vendedor",
      docs: r._count._all,
      total: r._sum.total ?? 0,
    }))
    .sort((a, b) => b.total - a.total);

  const vendedorOptions = vendedores
    .filter((v) => v.activo)
    .map((v) => ({ id: v.id, label: v.nombre }));
  const centroOptions = centros
    .filter((c) => c.activo)
    .map((c) => ({ id: c.id, label: `${c.codigo} · ${c.nombre}` }));
  const categoriaOptions = categorias
    .filter((c) => c.activo)
    .map((c) => ({ id: c.id, label: c.nombre }));

  const perfilCompleto = !!(
    tenant.rut &&
    tenant.razonSocial &&
    tenant.giro &&
    tenant.actividadEconomica &&
    tenant.direccion &&
    tenant.comuna
  );

  const certActivo = certificates.find((c) => c.active) ?? null;
  const ambiente = siiAmbiente();

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Facturación electrónica
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {tenant.name} ·{" "}
            <span
              className={`rounded px-1.5 py-0.5 text-xs ${
                certActivo
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              }`}
            >
              {certActivo
                ? `SII real · ${ambiente === "produccion" ? "producción" : "certificación"}`
                : "modo simulado"}
            </span>{" "}
            <span className="text-zinc-500">
              {certActivo
                ? canManage
                  ? `(certificado: ${certActivo.nombre})`
                  : "(certificado activo)"
                : "(adaptador mock del SII — sube un .p12 para emitir de verdad)"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModuleNav active="facturacion" hideConfig={!canManage} />
          <Link
            href="/dashboard"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← Panel
          </Link>
        </div>
      </header>

      {canManage && !perfilCompleto && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          Completa el perfil del emisor: no se puede emitir sin RUT, razón
          social, giro, actividad económica, dirección y comuna.
        </p>
      )}

      {canManage && (
        <>
          <EmisorForm
            tenantId={tenantId}
            initial={{
              rut: tenant.rut ? formatRut(tenant.rut) : "",
              razonSocial: tenant.razonSocial ?? "",
              giro: tenant.giro ?? "",
              actividadEconomica: tenant.actividadEconomica ?? "",
              direccion: tenant.direccion ?? "",
              comuna: tenant.comuna ?? "",
              emailSii: tenant.emailSii ?? "",
              resolucionNumero:
                tenant.resolucionNumero != null
                  ? String(tenant.resolucionNumero)
                  : "",
              resolucionFecha: tenant.resolucionFecha
                ? tenant.resolucionFecha.toISOString().slice(0, 10)
                : "",
            }}
          />
          <hr className="border-zinc-200 dark:border-zinc-800" />
          <CafsPanel
            tenantId={tenantId}
            cafs={cafs.map((c) => ({
              id: c.id,
              tipoDte: c.tipoDte,
              folioDesde: c.folioDesde,
              folioHasta: c.folioHasta,
              nextFolio: c.nextFolio,
              active: c.active,
            }))}
          />
          <hr className="border-zinc-200 dark:border-zinc-800" />
          <CertificadosPanel
            tenantId={tenantId}
            certificates={certificates.map((c) => ({
              id: c.id,
              nombre: c.nombre,
              subject: c.subject,
              rut: c.rut,
              notBefore: c.notBefore?.toISOString() ?? null,
              notAfter: c.notAfter?.toISOString() ?? null,
              active: c.active,
            }))}
          />
          <hr className="border-zinc-200 dark:border-zinc-800" />
        </>
      )}

      <DteForm
        tenantId={tenantId}
        sentido="SALIDA"
        vendedores={vendedorOptions}
        centros={centroOptions}
        categorias={categoriaOptions}
      />

      <DteList
        tenantId={tenantId}
        sentido="SALIDA"
        canManage={canManage}
        vendedores={vendedores.map((v) => ({ id: v.id, nombre: v.nombre }))}
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

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Ventas por vendedor
        </h2>
        {resumen.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Todavía no hay ventas registradas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                  <th className="px-4 py-2 font-medium">Vendedor</th>
                  <th className="px-4 py-2 text-right font-medium">Docs</th>
                  <th className="px-4 py-2 text-right font-medium">Total ventas</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((r) => (
                  <tr
                    key={r.nombre}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                  >
                    <td className="px-4 py-2">{r.nombre}</td>
                    <td className="px-4 py-2 text-right text-zinc-600 dark:text-zinc-400">
                      {r.docs}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
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

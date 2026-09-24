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
import { modulosActivos } from "@/lib/modules";
import { PortalCredencialPanel } from "@/components/portal-credencial-panel";

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

  const activos = await modulosActivos(tenantId);
  if (!activos.has("FACTURACION")) redirect("/dashboard");

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) redirect("/dashboard");

  const [
    documentos,
    vendedores,
    centros,
    categorias,
    cafs,
    certificates,
    resumenRaw,
    portalCredential,
  ] =
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
      db.siiPortalCredential.findUnique({ where: { tenantId } }),
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
          <h1 className="text-2xl font-semibold text-ink">
            Facturación electrónica
          </h1>
          <p className="text-sm text-ink-soft">
            {tenant.name} ·{" "}
            <span className={certActivo ? "chip chip-ok" : "chip chip-orange"}>
              {certActivo
                ? `SII real · ${ambiente === "produccion" ? "producción" : "certificación"}`
                : "modo simulado"}
            </span>{" "}
            <span className="text-ink-soft">
              {certActivo
                ? canManage
                  ? `(certificado: ${certActivo.nombre})`
                  : "(certificado activo)"
                : "(adaptador mock del SII — sube un .p12 para emitir de verdad)"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModuleNav
            active="facturacion"
            activos={[...activos]}
            hideConfig={!canManage}
          />
          <Link href="/dashboard" className="btn btn-ghost">
            ← Panel
          </Link>
        </div>
      </header>

      {canManage && !perfilCompleto && (
        <p className="alert alert-warn">
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
          <hr className="border-line" />
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
          <hr className="border-line" />
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
          <hr className="border-line" />
          <PortalCredencialPanel
            tenantId={tenantId}
            credential={
              portalCredential
                ? {
                    rut: portalCredential.rut,
                    createdAt: portalCredential.createdAt.toISOString(),
                  }
                : null
            }
          />
          <hr className="border-line" />
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
          xmlDisponible: Boolean(d.xml),
          vendedor: d.vendedor,
          costCenter: d.costCenter,
        }))}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-ink">Ventas por vendedor</h2>
        {resumen.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Todavía no hay ventas registradas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Vendedor</th>
                  <th scope="col" className="text-right">Docs</th>
                  <th scope="col" className="text-right">Total ventas</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((r) => (
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

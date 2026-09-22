import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageTenant } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { formatRut } from "@/lib/rut";
import { CafsPanel } from "@/components/cafs-panel";
import { DteForm } from "@/components/dte-form";
import { DteList } from "@/components/dte-list";
import { EmisorForm } from "@/components/emisor-form";

export const dynamic = "force-dynamic";

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

  const documentos = await db.dteDocument.findMany({
    where: { tenantId, sentido: "SALIDA" },
    orderBy: [{ fechaEmision: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  const cafs = canManage
    ? await db.caf.findMany({
        where: { tenantId },
        orderBy: [{ tipoDte: "asc" }, { folioDesde: "asc" }],
      })
    : [];

  const perfilCompleto = !!(
    tenant.rut &&
    tenant.razonSocial &&
    tenant.giro &&
    tenant.actividadEconomica &&
    tenant.direccion &&
    tenant.comuna
  );

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Facturación electrónica
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {tenant.name} ·{" "}
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              modo simulado
            </span>{" "}
            <span className="text-zinc-500">
              (adaptador mock del SII hasta la certificación)
            </span>
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ← Panel
        </Link>
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
        </>
      )}

      <DteForm tenantId={tenantId} />

      <DteList
        tenantId={tenantId}
        documentos={documentos.map((d) => ({
          id: d.id,
          tipoDte: d.tipoDte,
          folio: d.folio,
          fechaEmision: d.fechaEmision.toISOString(),
          receptorRut: d.receptorRut,
          receptorRazonSocial: d.receptorRazonSocial,
          total: d.total,
          estado: d.estado,
          trackId: d.trackId,
        }))}
      />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageTenant } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { TenantPanel } from "@/components/tenant-panel";
import { MembersPanel } from "@/components/members-panel";
import { OnboardingPasos, type PasoOnboarding } from "@/components/onboarding-pasos";

export const dynamic = "force-dynamic";

const CONSEJOS = [
  {
    titulo: "Cada fila descarga su documento",
    detalle:
      "El XML firmado y el PDF de cada DTE, directo desde la lista de ventas o compras.",
  },
  {
    titulo: "Clasifica tu gasto",
    detalle:
      "Área y categoría en cada compra: el desglose aparece solo en Reportes.",
  },
  {
    titulo: "El registro llega del SII",
    detalle:
      "Con tus credenciales del portal, el registro CSV se descarga sin salir de Yellow.",
  },
];

/**
 * Onboarding del área: puesta en marcha con progreso real del tenant y
 * administración del espacio de trabajo (equipo y espacios), al estilo
 * Inicio → Onboarding del ERP de referencia.
 */
export default async function OnboardingPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const active = ctx.memberships.find(
    (m) => m.tenantId === ctx.session.activeTenantId,
  );
  if (!active) redirect("/dashboard");

  const tenantId = active.tenantId;
  const canManage = canManageTenant(ctx, tenantId);

  const [
    members,
    invitations,
    tenant,
    certActivo,
    cafs,
    ventas,
    compras,
  ] = await Promise.all([
    db.tenantMember.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, email: true, name: true } } },
    }),
    canManage
      ? db.invitation.findMany({
          where: { tenantId, acceptedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
          select: { id: true, email: true, role: true, expiresAt: true },
        })
      : Promise.resolve([]),
    db.tenant.findUnique({ where: { id: tenantId } }),
    db.siiCertificate.findFirst({
      where: { tenantId, active: true },
      select: { id: true },
    }),
    db.caf.count({ where: { tenantId, active: true } }),
    db.dteDocument.count({ where: { tenantId, sentido: "SALIDA" } }),
    db.dteDocument.count({ where: { tenantId, sentido: "ENTRADA" } }),
  ]);

  const perfilCompleto = !!(
    tenant?.rut &&
    tenant?.razonSocial &&
    tenant?.giro &&
    tenant?.actividadEconomica &&
    tenant?.direccion &&
    tenant?.comuna
  );

  const pasos: PasoOnboarding[] = [
    {
      titulo: "Parametriza tu empresa",
      detalle:
        "Perfil del emisor: RUT, razón social, giro, actividad económica, dirección y comuna.",
      href: "/erp?sentido=SALIDA",
      hecho: perfilCompleto,
    },
    {
      titulo: "Activa tu factura electrónica",
      detalle: "Sube el certificado .p12 que emite el SII para tu RUT.",
      href: "/erp?sentido=SALIDA",
      hecho: !!certActivo,
    },
    {
      titulo: "Carga tus CAF",
      detalle: "Pega el XML de folios autorizados de cada tipo de documento.",
      href: "/erp?sentido=SALIDA",
      hecho: cafs > 0,
    },
    {
      titulo: "Crea tu primera venta",
      detalle: "Registra una factura y emítela al SII desde la lista.",
      href: "/erp?sentido=SALIDA",
      hecho: ventas > 0,
    },
    {
      titulo: "Registra una compra",
      detalle:
        "Registra una factura de proveedor y clasifícala por área y categoría.",
      href: "/erp?sentido=ENTRADA",
      hecho: compras > 0,
    },
  ];
  const hechos = pasos.filter((p) => p.hecho).length;
  const progreso = Math.round((hechos / pasos.length) * 100);

  return (
    <div className="relative space-y-10 overflow-hidden">
      {/* Lavado de fondo de marca */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-bright/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-orange/10 blur-3xl"
      />

      <section className="relative space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">
              Bienvenido a tu Yellow
            </h1>
            <p className="text-sm text-ink-soft">
              {active.tenant.name} · configura y empieza a facturar
            </p>
          </div>
          <p className="text-sm font-medium text-ink">Tu progreso: {progreso}%</p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progreso}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progreso de configuración"
          className="h-2 w-full rounded-full bg-block"
        >
          <div
            className="h-2 rounded-full bg-navy transition-all"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </section>

      <section className="relative">
        <OnboardingPasos pasos={pasos} />
      </section>

      <section className="relative space-y-3">
        <h2 className="text-lg font-medium text-ink">Cuentas claras</h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {CONSEJOS.map((consejo) => (
            <li
              key={consejo.titulo}
              className="panel p-4 shadow-sm shadow-navy/10"
            >
              <p className="text-sm font-medium text-ink">{consejo.titulo}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                {consejo.detalle}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="relative">
        <TenantPanel
          memberships={ctx.memberships}
          activeTenantId={ctx.session.activeTenantId}
        />
      </div>

      <div className="relative">
        <MembersPanel
          tenantId={tenantId}
          members={members.map((m) => ({
            userId: m.userId,
            email: m.user.email,
            name: m.user.name,
            role: m.role,
          }))}
          invitations={invitations.map((i) => ({
            id: i.id,
            email: i.email,
            role: i.role,
            expiresAt: i.expiresAt.toISOString(),
          }))}
          canManage={canManage}
        />
      </div>

      <section className="relative space-y-2 text-sm text-ink-soft">
        <h2 className="text-lg font-medium text-ink">Cuenta</h2>
        <p>
          {ctx.user.name ? `${ctx.user.name} · ` : ""}
          {ctx.user.email}
          {canManage && (
            <>
              {" · "}
              <Link
                href="/configuracion"
                className="text-blue underline hover:text-orange-ink"
              >
                Configuración
              </Link>
            </>
          )}
        </p>
      </section>
    </div>
  );
}

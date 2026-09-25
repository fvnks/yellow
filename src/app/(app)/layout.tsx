import { redirect } from "next/navigation";
import { canManageTenant } from "@/lib/authz";
import { modulosActivos, type ModuloKey } from "@/lib/modules";
import { getAuthContext } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { Sidebar, type SidebarGrupo } from "@/components/sidebar";

export const dynamic = "force-dynamic";

/**
 * Layout del área de módulos: valida la sesión una sola vez (absorbe la
 * guardia que vivía en el layout de dashboard) y arma la sidebar con los
 * grupos que corresponden según los módulos activados del tenant.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const grupos: SidebarGrupo[] = [
    {
      titulo: "Inicio",
      items: [
        { href: "/dashboard", label: "Panel" },
        { href: "/onboarding", label: "Onboarding" },
      ],
    },
  ];
  if (activos.has("ERP")) {
    grupos.push({
      titulo: "ERP",
      items: [
        { href: "/erp?sentido=SALIDA", label: "Ventas" },
        { href: "/erp?sentido=ENTRADA", label: "Compras" },
        { href: "/erp/gastos", label: "Gastos" },
        { href: "/erp/cotizaciones", label: "Cotizaciones" },
        { href: "/erp/directorio", label: "Directorio" },
      ],
    });
  }
  if (activos.has("LIBROS")) {
    grupos.push({
      titulo: "Libros",
      items: [{ href: "/libros", label: "Libro C/V" }],
    });
  }
  if (activos.has("REPORTES")) {
    grupos.push({
      titulo: "Reportes",
      items: [{ href: "/reportes", label: "Reportes" }],
    });
  }
  if (canManage) {
    grupos.push({
      titulo: "Configuración",
      items: [{ href: "/configuracion", label: "Maestros" }],
    });
  }

  return (
    <>
      <AppHeader />
      <div className="flex flex-col gap-8 lg:flex-row">
        <Sidebar grupos={grupos} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}

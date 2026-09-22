import { redirect } from "next/navigation";
import { canManageTenant } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { TenantPanel } from "@/components/tenant-panel";
import { MembersPanel } from "@/components/members-panel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const active = ctx.memberships.find(
    (m) => m.tenantId === ctx.session.activeTenantId,
  );

  const tenantId = active?.tenantId ?? null;
  const canManage = tenantId ? canManageTenant(ctx, tenantId) : false;

  const members = tenantId
    ? await db.tenantMember.findMany({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, email: true, name: true } } },
      })
    : [];

  const invitations =
    tenantId && canManage
      ? await db.invitation.findMany({
          where: { tenantId, acceptedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
          select: { id: true, email: true, role: true, expiresAt: true },
        })
      : [];

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Panel
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {active ? (
            <>
              Tenant activo:{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {active.tenant.name}
              </span>{" "}
              ({active.tenant.slug}) · rol {active.role}
            </>
          ) : (
            "Aún no perteneces a ningún tenant."
          )}
        </p>
      </section>

      <TenantPanel
        memberships={ctx.memberships}
        activeTenantId={ctx.session.activeTenantId}
      />

      {tenantId && (
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
      )}

      <section className="space-y-2 text-sm text-zinc-500">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Cuenta
        </h2>
        <p>
          {ctx.user.name ? `${ctx.user.name} · ` : ""}
          {ctx.user.email}
        </p>
      </section>
    </div>
  );
}

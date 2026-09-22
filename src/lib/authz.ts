import type { AuthContext, Membership } from "@/lib/session";

export type Role = "OWNER" | "ADMIN" | "MEMBER";

/** Roles allowed to administer a tenant (invite, revoke, list members). */
export function canManageMembers(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Membership of the current user in a given tenant, or null. */
export function findMembership(
  ctx: AuthContext,
  tenantId: string,
): Membership | null {
  return ctx.memberships.find((m) => m.tenantId === tenantId) ?? null;
}

/**
 * True when the user both belongs to the tenant and has a manager role.
 * Missing membership and plain MEMBER are both denied.
 */
export function canManageTenant(ctx: AuthContext, tenantId: string): boolean {
  const membership = findMembership(ctx, tenantId);
  return membership != null && canManageMembers(membership.role);
}

/** An invitation is usable when it has not been accepted and has not expired. */
export function isActiveInvite(
  invite: { expiresAt: Date; acceptedAt: Date | null },
  now: Date = new Date(),
): boolean {
  return invite.acceptedAt === null && invite.expiresAt.getTime() > now.getTime();
}

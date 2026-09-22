import { describe, expect, it } from "vitest";
import {
  canManageMembers,
  canManageTenant,
  findMembership,
  isActiveInvite,
} from "./authz";
import type { AuthContext } from "./session";

function ctxWith(...roles: Array<"OWNER" | "ADMIN" | "MEMBER">): AuthContext {
  return {
    session: { id: "s1", userId: "u1", activeTenantId: "t1", expiresAt: new Date() },
    user: { id: "u1", email: "a@b.co", name: null },
    memberships: roles.map((role, i) => ({
      tenantId: `t${i + 1}`,
      role,
      tenant: { id: `t${i + 1}`, name: `Tenant ${i + 1}`, slug: `tenant-${i + 1}` },
    })),
  };
}

describe("canManageMembers", () => {
  it("grants OWNER and ADMIN, denies MEMBER", () => {
    expect(canManageMembers("OWNER")).toBe(true);
    expect(canManageMembers("ADMIN")).toBe(true);
    expect(canManageMembers("MEMBER")).toBe(false);
  });
});

describe("findMembership / canManageTenant", () => {
  it("finds the membership for a tenant", () => {
    const ctx = ctxWith("OWNER", "MEMBER");
    expect(findMembership(ctx, "t2")?.role).toBe("MEMBER");
    expect(findMembership(ctx, "nope")).toBeNull();
  });

  it("allows managers, denies members and outsiders", () => {
    const ctx = ctxWith("OWNER", "MEMBER");
    expect(canManageTenant(ctx, "t1")).toBe(true); // OWNER
    expect(canManageTenant(ctx, "t2")).toBe(false); // MEMBER
    expect(canManageTenant(ctx, "t999")).toBe(false); // no membership
  });
});

describe("isActiveInvite", () => {
  const now = new Date("2026-01-10T00:00:00Z");

  it("active when pending and not expired", () => {
    expect(
      isActiveInvite({ expiresAt: new Date("2026-01-17T00:00:00Z"), acceptedAt: null }, now),
    ).toBe(true);
  });

  it("inactive when already accepted", () => {
    expect(
      isActiveInvite(
        { expiresAt: new Date("2026-01-17T00:00:00Z"), acceptedAt: now },
        now,
      ),
    ).toBe(false);
  });

  it("inactive when expired (boundary: equal → expired)", () => {
    expect(isActiveInvite({ expiresAt: now, acceptedAt: null }, now)).toBe(false);
    expect(
      isActiveInvite({ expiresAt: new Date("2026-01-09T00:00:00Z"), acceptedAt: null }, now),
    ).toBe(false);
  });
});

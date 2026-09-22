import { describe, expect, it } from "vitest";
import {
  acceptInviteSchema,
  createTenantSchema,
  inviteSchema,
  loginSchema,
  registerSchema,
  switchTenantSchema,
} from "./validation";

describe("registerSchema", () => {
  it("accepts a valid payload and normalizes the email", () => {
    const parsed = registerSchema.parse({
      email: "  USER@Example.COM ",
      password: "supersecret1",
      name: "Ana",
      tenantName: "Empresa SpA",
    });
    expect(parsed.email).toBe("user@example.com");
  });

  it("rejects short passwords", () => {
    const r = registerSchema.safeParse({ email: "a@b.co", password: "short" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid emails", () => {
    const r = registerSchema.safeParse({ email: "not-an-email", password: "supersecret1" });
    expect(r.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires both fields", () => {
    expect(loginSchema.safeParse({ email: "a@b.co" }).success).toBe(false);
    expect(loginSchema.safeParse({ password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
});

describe("createTenantSchema / switchTenantSchema", () => {
  it("trims and requires a tenant name", () => {
    expect(createTenantSchema.parse({ name: "  Acme  " }).name).toBe("Acme");
    expect(createTenantSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("requires tenantId", () => {
    expect(switchTenantSchema.safeParse({}).success).toBe(false);
    expect(switchTenantSchema.safeParse({ tenantId: "t1" }).success).toBe(true);
  });
});

describe("inviteSchema", () => {
  it("defaults to MEMBER and normalizes the email", () => {
    const parsed = inviteSchema.parse({ email: "  Invitee@Example.COM " });
    expect(parsed.email).toBe("invitee@example.com");
    expect(parsed.role).toBe("MEMBER");
  });

  it("accepts ADMIN but rejects OWNER (no privilege escalation)", () => {
    expect(inviteSchema.parse({ email: "a@b.co", role: "ADMIN" }).role).toBe("ADMIN");
    expect(
      inviteSchema.safeParse({ email: "a@b.co", role: "OWNER" }).success,
    ).toBe(false);
  });
});

describe("acceptInviteSchema", () => {
  it("requires a token of sufficient length", () => {
    expect(acceptInviteSchema.safeParse({ token: "abc" }).success).toBe(false);
    expect(
      acceptInviteSchema.safeParse({ token: "a".repeat(43) }).success,
    ).toBe(true);
  });
});

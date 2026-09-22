import { describe, expect, it } from "vitest";
import {
  createTenantSchema,
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

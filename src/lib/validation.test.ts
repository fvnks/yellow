import { describe, expect, it } from "vitest";
import {
  acceptInviteSchema,
  createDteSchema,
  createTenantSchema,
  inviteSchema,
  loginSchema,
  registerSchema,
  switchTenantSchema,
  updateEmisorSchema,
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

describe("createDteSchema", () => {
  const item = { nombre: "Servicio", cantidad: 1, precioUnitario: 1000 };
  const base = {
    tipoDte: 33,
    receptorRut: "12.345.678-5",
    receptorRazonSocial: "Cliente Ltda",
    items: [item],
  };

  it("accepts a valid factura and applies item defaults", () => {
    const parsed = createDteSchema.parse(base);
    expect(parsed.items[0].descuento).toBe(0);
    expect(parsed.items[0].afectoIva).toBe(true);
    expect(parsed.receptorRazonSocial).toBe("Cliente Ltda");
  });

  it("rejects unsupported types and invalid receptor RUT", () => {
    expect(createDteSchema.safeParse({ ...base, tipoDte: 39 }).success).toBe(false);
    expect(createDteSchema.safeParse({ ...base, tipoDte: 33.5 }).success).toBe(false);
    expect(
      createDteSchema.safeParse({ ...base, receptorRut: "11.111.111-2" }).success,
    ).toBe(false);
  });

  it("requires references for notas (56/61)", () => {
    expect(createDteSchema.safeParse({ ...base, tipoDte: 61 }).success).toBe(false);
    expect(
      createDteSchema.safeParse({
        ...base,
        tipoDte: 61,
        references: [{ tipoDteRef: 33, folioRef: 12 }],
      }).success,
    ).toBe(true);
  });

  it("requires tipoTraslado for guía de despacho (52)", () => {
    expect(createDteSchema.safeParse({ ...base, tipoDte: 52 }).success).toBe(false);
    expect(
      createDteSchema.safeParse({ ...base, tipoDte: 52, tipoTraslado: 4 }).success,
    ).toBe(true);
  });

  it("rejects empty items, zero quantities and negative prices", () => {
    expect(createDteSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    expect(
      createDteSchema.safeParse({
        ...base,
        items: [{ ...item, cantidad: 0 }],
      }).success,
    ).toBe(false);
    expect(
      createDteSchema.safeParse({
        ...base,
        items: [{ ...item, precioUnitario: -1 }],
      }).success,
    ).toBe(false);
  });
});

describe("updateEmisorSchema", () => {
  it("accepts partial updates with a valid RUT", () => {
    expect(updateEmisorSchema.safeParse({ rut: "76.543.210-3" }).success).toBe(true);
    expect(updateEmisorSchema.safeParse({}).success).toBe(true);
    expect(updateEmisorSchema.safeParse({ rut: "nope" }).success).toBe(false);
    expect(
      updateEmisorSchema.safeParse({ resolucionFecha: "2026-13-01" }).success,
    ).toBe(false);
    expect(
      updateEmisorSchema.safeParse({ resolucionFecha: "2026-02-30" }).success,
    ).toBe(false);
    expect(
      updateEmisorSchema.safeParse({ resolucionFecha: "2026-02-28" }).success,
    ).toBe(true);
  });
});

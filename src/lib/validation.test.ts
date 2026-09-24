import { describe, expect, it } from "vitest";
import {
  acceptInviteSchema,
  anularDteSchema,
  classifyCompraSchema,
  createCategoriaSchema,
  createCentroCostoSchema,
  createDteSchema,
  createGastoSchema,
  createTenantSchema,
  createVendedorSchema,
  inviteSchema,
  loginSchema,
  registerSchema,
  switchTenantSchema,
  toggleModuloSchema,
  updateCentroCostoSchema,
  updateEmisorSchema,
  updateGastoSchema,
  updateVendedorSchema,
  uploadCertificateSchema,
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

  it("rejects a venta (SALIDA) without receptor", () => {
    const sinReceptor: Partial<typeof base> = { ...base };
    delete sinReceptor.receptorRut;
    delete sinReceptor.receptorRazonSocial;
    const parsed = createDteSchema.safeParse(sinReceptor);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes("receptorRut"))).toBe(true);
    }
  });

  it("accepts a purchase (ENTRADA) with provider + folio and no receptor", () => {
    const parsed = createDteSchema.safeParse({
      sentido: "ENTRADA",
      tipoDte: 46,
      folio: 77,
      emisorRut: "76.543.210-3",
      emisorRazonSocial: "Proveedor Ltda",
      items: [item],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.sentido).toBe("ENTRADA");
  });

  it("requires provider and folio for ENTRADA, and a valid provider RUT", () => {
    expect(
      createDteSchema.safeParse({ sentido: "ENTRADA", tipoDte: 46, items: [item] })
        .success,
    ).toBe(false);
    const badRut = createDteSchema.safeParse({
      sentido: "ENTRADA",
      tipoDte: 46,
      folio: 77,
      emisorRut: "11.111.111-2",
      emisorRazonSocial: "Proveedor",
      items: [item],
    });
    expect(badRut.success).toBe(false);
  });
});

describe("master data schemas", () => {
  it("creates vendedores/centros/categorias with sensible bounds", () => {
    expect(createVendedorSchema.safeParse({ nombre: "Ana Pérez" }).success).toBe(true);
    expect(createVendedorSchema.safeParse({ nombre: "" }).success).toBe(false);
    expect(
      createCentroCostoSchema.parse({ codigo: "adm", nombre: "Administración" }),
    ).toEqual({ codigo: "ADM", nombre: "Administración" });
    expect(
      createCentroCostoSchema.safeParse({ codigo: "", nombre: "x" }).success,
    ).toBe(false);
    expect(createCategoriaSchema.safeParse({ nombre: "Insumos" }).success).toBe(true);
  });

  it("patches allow deactivating and clearing the email", () => {
    expect(updateVendedorSchema.safeParse({ activo: false }).success).toBe(true);
    expect(updateVendedorSchema.safeParse({ email: "" }).success).toBe(true);
    expect(updateVendedorSchema.safeParse({ email: "no-es-email" }).success).toBe(false);
    expect(updateCentroCostoSchema.safeParse({ codigo: "NUEVO" }).success).toBe(false);
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

describe("uploadCertificateSchema", () => {
  const longBase64 = "A".repeat(80);

  it("accepts a p12 blob, stripping whitespace before the size check", () => {
    const spaced = longBase64.match(/.{1,40}/g)!.join("\n");
    const parsed = uploadCertificateSchema.parse({
      p12Base64: spaced,
      password: "clave123",
      nombre: "Certificado productivo",
    });
    expect(parsed.p12Base64).toBe(longBase64);
    expect(parsed.nombre).toBe("Certificado productivo");
  });

  it("rejects a blob too small to be a real PKCS#12", () => {
    const r = uploadCertificateSchema.safeParse({
      p12Base64: "dG9tIGNvcnRv",
      password: "clave123",
    });
    expect(r.success).toBe(false);
  });

  it("requires a password and rejects oversized blobs", () => {
    expect(
      uploadCertificateSchema.safeParse({ p12Base64: longBase64 }).success,
    ).toBe(false);
    expect(
      uploadCertificateSchema.safeParse({
        p12Base64: "A".repeat(400_001),
        password: "x",
      }).success,
    ).toBe(false);
  });
});

describe("anularDteSchema", () => {
  it("accepts both methods with a concrete motivo", () => {
    expect(
      anularDteSchema.safeParse({ metodo: "nc", motivo: "Error en datos del receptor" })
        .success,
    ).toBe(true);
    expect(
      anularDteSchema.safeParse({
        metodo: "directa",
        motivo: "Pedido cancelado por el cliente",
      }).success,
    ).toBe(true);
  });

  it("rejects unknown methods and empty, tiny or oversized motivos", () => {
    expect(anularDteSchema.safeParse({ metodo: "borrar", motivo: "Motivo válido aquí" }).success).toBe(false);
    expect(anularDteSchema.safeParse({ metodo: "nc", motivo: "abc" }).success).toBe(false);
    expect(anularDteSchema.safeParse({ metodo: "nc", motivo: "x".repeat(91) }).success).toBe(false);
  });
});

describe("toggleModuloSchema", () => {
  it("accepts a key + flag pair", () => {
    expect(toggleModuloSchema.parse({ key: "REPORTES", activo: true })).toEqual({
      key: "REPORTES",
      activo: true,
    });
    expect(toggleModuloSchema.safeParse({ key: "LIBROS", activo: false }).success).toBe(true);
  });

  it("rejects a missing key or flag", () => {
    expect(toggleModuloSchema.safeParse({ activo: true }).success).toBe(false);
    expect(toggleModuloSchema.safeParse({ key: "REPORTES" }).success).toBe(false);
  });
});

describe("createGastoSchema", () => {
  const base = {
    descripcion: "Taxi a reunión",
    monto: 4500,
    categoriaId: "cat1",
    fecha: "2026-09-24",
  };

  it("accepts a complete expense and an optional reimbursement date", () => {
    expect(createGastoSchema.safeParse(base).success).toBe(true);
    expect(createGastoSchema.safeParse({ ...base, fechaReembolso: "2026-09-25" }).success).toBe(true);
    expect(createGastoSchema.safeParse({ ...base, comentario: "Recorrido visita cliente" }).success).toBe(true);
  });

  it("rejects empty/invalid amounts and missing fields", () => {
    expect(createGastoSchema.safeParse({ ...base, monto: 0 }).success).toBe(false);
    expect(createGastoSchema.safeParse({ ...base, monto: 12.5 }).success).toBe(false);
    expect(createGastoSchema.safeParse({ ...base, descripcion: "" }).success).toBe(false);
    expect(createGastoSchema.safeParse({ monto: 100, categoriaId: "x", fecha: "2026-09-24" }).success).toBe(false);
    expect(createGastoSchema.safeParse({ ...base, fecha: "2026-13-01" }).success).toBe(false);
  });
});

describe("updateGastoSchema", () => {
  it("accepts a partial update and null to reset the reimbursement", () => {
    expect(updateGastoSchema.safeParse({ fechaReembolso: "2026-09-25" }).success).toBe(true);
    expect(updateGastoSchema.safeParse({ fechaReembolso: null }).success).toBe(true);
    expect(updateGastoSchema.safeParse({ monto: 5000 }).success).toBe(true);
  });

  it("rejects an empty payload and invalid values", () => {
    expect(updateGastoSchema.safeParse({}).success).toBe(false);
    expect(updateGastoSchema.safeParse({ monto: -1 }).success).toBe(false);
  });
});

describe("classifyCompraSchema", () => {
  it("accepts ids, empty strings (clear) and partial payloads", () => {
    expect(
      classifyCompraSchema.safeParse({ costCenterId: "c1", categoriaId: "k1" })
        .success,
    ).toBe(true);
    // "" clears the dimension; the route maps it to null.
    expect(
      classifyCompraSchema.safeParse({ costCenterId: "", categoriaId: "" }).success,
    ).toBe(true);
    // One dimension only: the other one stays untouched.
    expect(classifyCompraSchema.safeParse({ categoriaId: "k1" }).success).toBe(true);
  });

  it("rejects a payload with no dimension at all", () => {
    expect(classifyCompraSchema.safeParse({}).success).toBe(false);
  });
});

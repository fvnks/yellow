import { z } from "zod";
import { isValidRut } from "./rut";

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(128, "La contraseña es demasiado larga");

export const emailSchema = z
  .string()
  .max(254)
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.email("Email inválido"));

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1).max(100).optional(),
  tenantName: z.string().trim().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Contraseña requerida").max(128),
});

export const createTenantSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(100),
});

export const switchTenantSchema = z.object({
  tenantId: z.string().min(1, "tenantId requerido"),
});

// OWNER transfer is out of scope: invitations can only grant ADMIN/MEMBER,
// so an ADMIN cannot escalate anyone (including themselves) to OWNER.
export const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(10, "Token inválido").max(200),
});

// ── DTE / facturación electrónica ──

/** Document types supported in the first phase (ventas, guías, notas, compras). */
export const SUPPORTED_DTE_TIPOS = [33, 34, 52, 46, 56, 61] as const;

/** Notas de débito/crédito must reference the document they adjust. */
const NOTA_TIPOS = [56, 61];

function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const dateSchema = z
  .string()
  .refine(isValidIsoDate, "Fecha inválida (debe ser una fecha real AAAA-MM-DD)");

export const dteItemSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(80),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0").max(999_999),
  precioUnitario: z.number().int().nonnegative(),
  descuento: z.number().int().nonnegative().default(0),
  afectoIva: z.boolean().default(true),
  /** Categoría del ítem (producto en ventas, tipo de gasto en compras). */
  categoryId: z.string().optional(),
});

export const dteReferenceInputSchema = z.object({
  tipoDteRef: z.number().int().positive(),
  folioRef: z.number().int().positive(),
  fechaRef: dateSchema.optional(),
  /** 1 = anula, 2 = corrige texto, 3 = corrige montos. */
  codigoRef: z.number().int().min(1).max(3).optional(),
  motivo: z.string().trim().max(90).optional(),
});

export const createDteSchema = z
  .object({
    /** SALIDA = factura propia (emisible); ENTRADA = factura recibida (compra). */
    sentido: z.enum(["SALIDA", "ENTRADA"]).default("SALIDA"),
    tipoDte: z.number().int(),
    fechaEmision: dateSchema.optional(),
    /** Folio del proveedor — required for ENTRADA; SALIDA folios come from the CAF. */
    folio: z.number().int().positive().optional(),
    // ── Receptor (SALIDA) ──
    receptorRut: z.string().refine(isValidRut, "RUT del receptor inválido").optional(),
    receptorRazonSocial: z.string().trim().min(1).max(60).optional(),
    receptorGiro: z.string().trim().max(40).optional(),
    receptorDireccion: z.string().trim().max(70).optional(),
    receptorComuna: z.string().trim().max(30).optional(),
    receptorEmail: emailSchema.optional(),
    // ── Proveedor/emisor (ENTRADA) ──
    emisorRut: z.string().refine(isValidRut, "RUT del proveedor inválido").optional(),
    emisorRazonSocial: z.string().trim().min(1).max(60).optional(),
    emisorGiro: z.string().trim().max(40).optional(),
    // ── Commercial dimensions (validated for ownership by the route) ──
    vendedorId: z.string().optional(),
    costCenterId: z.string().optional(),
    /** Indicador de traslado, obligatorio en guías de despacho (52). */
    tipoTraslado: z.number().int().min(1).max(9).optional(),
    motivoTraslado: z.string().trim().max(90).optional(),
    items: z.array(dteItemSchema).min(1, "Debe tener al menos un ítem").max(60),
    references: z.array(dteReferenceInputSchema).max(40).optional(),
  })
  .superRefine((data, ctx) => {
    if (!(SUPPORTED_DTE_TIPOS as readonly number[]).includes(data.tipoDte)) {
      ctx.addIssue({
        code: "custom",
        path: ["tipoDte"],
        message: "Tipo de DTE no soportado",
      });
    }
    const esSalida = data.sentido === "SALIDA";
    if (esSalida) {
      if (!data.receptorRut) {
        ctx.addIssue({
          code: "custom",
          path: ["receptorRut"],
          message: "RUT del receptor requerido",
        });
      }
      if (!data.receptorRazonSocial) {
        ctx.addIssue({
          code: "custom",
          path: ["receptorRazonSocial"],
          message: "Razón social del receptor requerida",
        });
      }
      if (data.tipoDte === 52 && data.tipoTraslado == null) {
        ctx.addIssue({
          code: "custom",
          path: ["tipoTraslado"],
          message: "Indicador de traslado requerido para guía (52)",
        });
      }
    } else {
      if (!data.emisorRut) {
        ctx.addIssue({
          code: "custom",
          path: ["emisorRut"],
          message: "RUT del proveedor requerido",
        });
      }
      if (!data.emisorRazonSocial) {
        ctx.addIssue({
          code: "custom",
          path: ["emisorRazonSocial"],
          message: "Razón social del proveedor requerida",
        });
      }
      if (data.folio == null) {
        ctx.addIssue({
          code: "custom",
          path: ["folio"],
          message: "Folio del documento requerido",
        });
      }
    }
    if (NOTA_TIPOS.includes(data.tipoDte) && !data.references?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["references"],
        message: "La nota debe referenciar el documento que corrige",
      });
    }
  });

/**
 * Clasificación de una compra ya registrada: área (centro de costo) +
 * categoría aplicada a todos sus ítems.
 *   "" (string vacío)  → limpia la dimensión.
 *   undefined/ausente  → la deja intacta.
 */
export const classifyCompraSchema = z
  .object({
    costCenterId: z.string().optional(),
    categoriaId: z.string().optional(),
  })
  .refine((d) => d.costCenterId !== undefined || d.categoriaId !== undefined, {
    message: "Envía al menos una dimensión (área o categoría)",
  });

/** Payload de activación/desactivación de un módulo (la clave se valida en la ruta). */
export const toggleModuloSchema = z.object({
  key: z.string().min(1, "Módulo requerido"),
  activo: z.boolean(),
});

/** Gasto de caja menor con reembolso opcional (mismo maestro de categorías). */
export const createGastoSchema = z.object({
  descripcion: z.string().trim().min(1, "Descripción requerida").max(120),
  monto: z.number().int("El monto debe ser un entero en CLP").positive("El monto debe ser mayor a 0"),
  categoriaId: z.string().min(1, "Categoría requerida"),
  fecha: dateSchema,
  fechaReembolso: dateSchema.optional(),
  comentario: z.string().trim().max(500, "Máx. 500 caracteres").optional(),
});

/** Edición parcial de un gasto; fechaReembolso null vuelve a pendiente. */
export const updateGastoSchema = z
  .object({
    descripcion: z.string().trim().min(1).max(120).optional(),
    monto: z.number().int().positive().optional(),
    categoriaId: z.string().optional(),
    fecha: dateSchema.optional(),
    fechaReembolso: z.union([dateSchema, z.null()]).optional(),
    comentario: z.string().trim().max(500).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Nada que actualizar",
  });

/** Partial update of the tenant's emisor profile. */
export const updateEmisorSchema = z.object({
  rut: z.string().refine(isValidRut, "RUT inválido").optional(),
  razonSocial: z.string().trim().min(1).max(60).optional(),
  giro: z.string().trim().min(1).max(40).optional(),
  actividadEconomica: z.string().trim().min(1).max(10).optional(),
  direccion: z.string().trim().min(1).max(70).optional(),
  comuna: z.string().trim().min(1).max(30).optional(),
  emailSii: emailSchema.optional(),
  resolucionNumero: z.number().int().nonnegative().optional(),
  resolucionFecha: dateSchema.optional(),
});

export const uploadCafSchema = z.object({
  xml: z.string().min(1, "CAF requerido").max(20_000, "CAF demasiado largo"),
});

// ── Maestros comerciales: vendedores, centros de costo, categorías ──

export const createVendedorSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(60),
  email: emailSchema.optional(),
});

/** "" as email clears it. */
export const updateVendedorSchema = z.object({
  nombre: z.string().trim().min(1).max(60).optional(),
  email: z.union([emailSchema, z.literal("")]).optional(),
  activo: z.boolean().optional(),
});

export const createCentroCostoSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, "Código requerido")
    .max(10)
    .transform((v) => v.toUpperCase()),
  nombre: z.string().trim().min(1, "Nombre requerido").max(60),
});

/** Strict: the codigo is immutable, so an update carrying it is rejected. */
export const updateCentroCostoSchema = z.strictObject({
  nombre: z.string().trim().min(1).max(60).optional(),
  activo: z.boolean().optional(),
});

export const createCategoriaSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(60),
});

export const updateCategoriaSchema = z.object({
  nombre: z.string().trim().min(1).max(60).optional(),
  activo: z.boolean().optional(),
});

// ── Certificado digital SII (.p12) ──

export const uploadCertificateSchema = z.object({
  nombre: z.string().trim().min(1).max(80).optional(),
  /** Base64 of the PKCS#12 file (whitespace tolerated). */
  p12Base64: z
    .string()
    .transform((v) => v.replace(/\s+/g, ""))
    .pipe(
      z
        .string()
        .min(64, "El archivo .p12 no parece válido")
        .max(400_000, "El archivo .p12 es demasiado grande"),
    ),
  password: z.string().min(1, "Contraseña requerida").max(256),
});

// ── Credenciales del portal SII (clave tributaria) para el registro CSV ──

export const portalCredentialSchema = z.object({
  rut: z.string().refine(isValidRut, "RUT inválido"),
  /** Clave tributaria: mínimo 8 caracteres según el SII. */
  clave: z.string().min(8, "La clave tributaria tiene al menos 8 caracteres").max(256),
});

// ── Anulación de DTE (FAQ SII 001.003.2167.006) ──

export const anularDteSchema = z.object({
  metodo: z.enum(["nc", "directa"]),
  /** Copiado a RazonRef (XSD maxLength 90) cuando se crea la nota. */
  motivo: z.string().trim().min(5, "Describe el motivo (mínimo 5 caracteres)").max(90),
});

/** Version-proof error shaping (works across zod major versions). */
export function issuesOf(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }));
}

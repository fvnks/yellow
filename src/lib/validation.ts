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
    tipoDte: z.number().int(),
    fechaEmision: dateSchema.optional(),
    receptorRut: z.string().refine(isValidRut, "RUT del receptor inválido"),
    receptorRazonSocial: z.string().trim().min(1, "Razón social requerida").max(60),
    receptorGiro: z.string().trim().max(40).optional(),
    receptorDireccion: z.string().trim().max(70).optional(),
    receptorComuna: z.string().trim().max(30).optional(),
    receptorEmail: emailSchema.optional(),
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
    if (NOTA_TIPOS.includes(data.tipoDte) && !data.references?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["references"],
        message: "La nota debe referenciar el documento que corrige",
      });
    }
    if (data.tipoDte === 52 && data.tipoTraslado == null) {
      ctx.addIssue({
        code: "custom",
        path: ["tipoTraslado"],
        message: "Indicador de traslado requerido para guía (52)",
      });
    }
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

/** Version-proof error shaping (works across zod major versions). */
export function issuesOf(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }));
}

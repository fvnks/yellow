import { z } from "zod";

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

/** Version-proof error shaping (works across zod major versions). */
export function issuesOf(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }));
}

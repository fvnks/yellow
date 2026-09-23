import { NextResponse } from "next/server";
import { canManageTenant, findMembership } from "@/lib/authz";
import { encryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { formatRutDv, normalizeRut } from "@/lib/rut";
import { getAuthContext } from "@/lib/session";
import { issuesOf, portalCredentialSchema } from "@/lib/validation";

/**
 * Credenciales del portal SII (RUT + clave tributaria) que alimentan la
 * descarga del registro de compras/ventas (Registro CSV en /libros). La clave se
 * guarda cifrada (AES-256-GCM) y jamás sale por la API. OWNER/ADMIN.
 */

function shape(c: { id: string; rut: string; createdAt: Date }) {
  return { id: c.id, rut: c.rut, createdAt: c.createdAt.toISOString() };
}

/**
 * GET — ¿este tenant tiene credenciales del portal? Devuelve sólo RUT y
 * fecha (nunca la clave).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!findMembership(ctx, tenantId)) {
    return NextResponse.json({ error: "No eres miembro de este tenant" }, { status: 403 });
  }
  if (!canManageTenant(ctx, tenantId)) {
    return NextResponse.json(
      { error: "Se requiere rol OWNER o ADMIN" },
      { status: 403 },
    );
  }

  const credencial = await db.siiPortalCredential.findUnique({
    where: { tenantId },
  });
  return NextResponse.json({ credential: credencial ? shape(credencial) : null });
}

/** PUT — crea o reemplaza las credenciales del portal del tenant. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!findMembership(ctx, tenantId)) {
      return NextResponse.json({ error: "No eres miembro de este tenant" }, { status: 403 });
    }
    if (!canManageTenant(ctx, tenantId)) {
      return NextResponse.json(
        { error: "Se requiere rol OWNER o ADMIN" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = portalCredentialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }

    const rut = formatRutDv(normalizeRut(parsed.data.rut));
    const credencial = await db.siiPortalCredential.upsert({
      where: { tenantId },
      create: {
        tenantId,
        rut,
        claveEncrypted: encryptSecret(parsed.data.clave),
      },
      update: {
        rut,
        claveEncrypted: encryptSecret(parsed.data.clave),
      },
    });

    return NextResponse.json({ credential: shape(credencial) });
  } catch (err) {
    console.error("[portal-credential:PUT] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

/** DELETE — elimina las credenciales (vuelve al modo simulado). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!findMembership(ctx, tenantId)) {
      return NextResponse.json({ error: "No eres miembro de este tenant" }, { status: 403 });
    }
    if (!canManageTenant(ctx, tenantId)) {
      return NextResponse.json(
        { error: "Se requiere rol OWNER o ADMIN" },
        { status: 403 },
      );
    }

    await db.siiPortalCredential.deleteMany({ where: { tenantId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[portal-credential:DELETE] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

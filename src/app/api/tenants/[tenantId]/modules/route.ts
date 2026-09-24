import { NextResponse } from "next/server";
import { canManageTenant, findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { MODULOS, esModuloKey } from "@/lib/modules";
import { getAuthContext } from "@/lib/session";
import { issuesOf, toggleModuloSchema } from "@/lib/validation";

/**
 * GET — registro de módulos con su estado de activación para el tenant.
 * Cualquier miembro puede ver (la página del panel lo usa).
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

  const filas = await db.tenantModule.findMany({
    where: { tenantId },
    select: { key: true },
  });
  const activos = new Set(filas.map((f) => f.key));

  return NextResponse.json({
    modulos: MODULOS.map((m) => ({ ...m, activo: activos.has(m.key) })),
  });
}

/**
 * PATCH — activa o desactiva un módulo. Solo OWNER/ADMIN: la activación
 * cambia qué ve todo el equipo.
 */
export async function PATCH(
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
        { error: "Se requiere rol OWNER o ADMIN para activar módulos" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = toggleModuloSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }
    if (!esModuloKey(parsed.data.key)) {
      return NextResponse.json({ error: "Módulo desconocido" }, { status: 400 });
    }
    const { key, activo } = parsed.data;

    if (activo) {
      await db.tenantModule.upsert({
        where: { tenantId_key: { tenantId, key } },
        create: { tenantId, key },
        update: {},
      });
    } else {
      await db.tenantModule.deleteMany({ where: { tenantId, key } });
    }

    return NextResponse.json({ ok: true, key, activo });
  } catch (err) {
    console.error("[modules:PATCH] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

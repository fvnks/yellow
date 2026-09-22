import { NextResponse } from "next/server";
import { canManageTenant, findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { issuesOf, updateCentroCostoSchema } from "@/lib/validation";

/** PATCH — rename or deactivate a cost center. OWNER/ADMIN only. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantId: string; centroId: string }> },
) {
  try {
    const { tenantId, centroId } = await params;
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
    const parsed = updateCentroCostoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }

    const existing = await db.centroCosto.findFirst({
      where: { id: centroId, tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Centro de costo no encontrado" }, { status: 404 });
    }

    const centro = await db.centroCosto.update({
      where: { id: centroId },
      data: parsed.data,
    });
    return NextResponse.json({ centro });
  } catch (err) {
    console.error("[centros-costo:PATCH] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

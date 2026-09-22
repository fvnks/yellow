import { NextResponse } from "next/server";
import { canManageTenant, findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { issuesOf, updateCategoriaSchema } from "@/lib/validation";

/** PATCH — rename or deactivate a category. OWNER/ADMIN only. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantId: string; categoriaId: string }> },
) {
  try {
    const { tenantId, categoriaId } = await params;
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
    const parsed = updateCategoriaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }

    const existing = await db.categoria.findFirst({
      where: { id: categoriaId, tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    const categoria = await db.categoria.update({
      where: { id: categoriaId },
      data: parsed.data,
    });
    return NextResponse.json({ categoria });
  } catch (err) {
    console.error("[categorias:PATCH] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

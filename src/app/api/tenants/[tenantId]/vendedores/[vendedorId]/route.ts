import { NextResponse } from "next/server";
import { canManageTenant, findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { issuesOf, updateVendedorSchema } from "@/lib/validation";

/** PATCH — rename, deactivate or update a seller. OWNER/ADMIN only. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantId: string; vendedorId: string }> },
) {
  try {
    const { tenantId, vendedorId } = await params;
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
    const parsed = updateVendedorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }

    const existing = await db.vendedor.findFirst({
      where: { id: vendedorId, tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Vendedor no encontrado" }, { status: 404 });
    }

    const { email, ...rest } = parsed.data;
    const vendedor = await db.vendedor.update({
      where: { id: vendedorId },
      data: {
        ...rest,
        ...(email !== undefined ? { email: email === "" ? null : email } : {}),
      },
    });
    return NextResponse.json({ vendedor });
  } catch (err) {
    console.error("[vendedores:PATCH] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { issuesOf, switchTenantSchema } from "@/lib/validation";

/**
 * POST — switch the active tenant of the current session.
 * Requires explicit membership: 403 when the user is not a member.
 */
export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = switchTenantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }

    const { tenantId } = parsed.data;
    const membership = ctx.memberships.find((m) => m.tenantId === tenantId);
    if (!membership) {
      return NextResponse.json(
        { error: "No eres miembro de este tenant" },
        { status: 403 },
      );
    }

    await db.session.update({
      where: { id: ctx.session.id },
      data: { activeTenantId: tenantId },
    });

    return NextResponse.json({
      activeTenantId: tenantId,
      role: membership.role,
      tenant: membership.tenant,
    });
  } catch (err) {
    console.error("[tenants:switch] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

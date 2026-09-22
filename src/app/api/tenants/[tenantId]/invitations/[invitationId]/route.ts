import { NextResponse } from "next/server";
import { canManageTenant, findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";

/** DELETE — revoke a pending invitation (OWNER/ADMIN only). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tenantId: string; invitationId: string }> },
) {
  try {
    const { tenantId, invitationId } = await params;
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

    const { count } = await db.invitation.deleteMany({
      where: { id: invitationId, tenantId, acceptedAt: null },
    });
    if (count === 0) {
      return NextResponse.json(
        { error: "Invitación no encontrada" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[invitations:DELETE] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

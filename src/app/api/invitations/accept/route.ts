import { NextResponse } from "next/server";
import { isActiveInvite } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { hashToken } from "@/lib/token";
import { acceptInviteSchema, issuesOf } from "@/lib/validation";

/**
 * POST — accept an invitation. The invitee must be logged in and their
 * account email must match the invited email (prevents link theft).
 */
export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = acceptInviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }

    const invitation = await db.invitation.findUnique({
      where: { tokenHash: hashToken(parsed.data.token) },
    });
    if (!invitation || !isActiveInvite(invitation)) {
      return NextResponse.json(
        { error: "Invitación inválida o expirada" },
        { status: 404 },
      );
    }

    if (invitation.email !== ctx.user.email) {
      return NextResponse.json(
        { error: "Esta invitación es para otro email" },
        { status: 403 },
      );
    }

    await db.$transaction(async (tx) => {
      await tx.tenantMember.upsert({
        where: {
          tenantId_userId: { tenantId: invitation.tenantId, userId: ctx.user.id },
        },
        create: {
          tenantId: invitation.tenantId,
          userId: ctx.user.id,
          role: invitation.role,
        },
        update: {},
      });
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      // Land in the tenant that was just joined.
      await tx.session.update({
        where: { id: ctx.session.id },
        data: { activeTenantId: invitation.tenantId },
      });
    });

    return NextResponse.json({
      ok: true,
      tenantId: invitation.tenantId,
      role: invitation.role,
    });
  } catch (err) {
    console.error("[invitations:accept] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

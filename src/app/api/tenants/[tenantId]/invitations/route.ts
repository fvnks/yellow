import { NextResponse } from "next/server";
import { canManageTenant, findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { generateSessionToken, hashToken } from "@/lib/token";
import { inviteSchema, issuesOf } from "@/lib/validation";

const INVITE_TTL_DAYS = 7;

/** GET — list pending invitations (OWNER/ADMIN only). */
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

  const invitations = await db.invitation.findMany({
    where: { tenantId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
  });
  return NextResponse.json({ invitations });
}

/**
 * POST — invite a user by email (OWNER/ADMIN only).
 * No mail provider is wired yet: the accept link is returned once here so
 * the inviter can share it manually. Email delivery is a later integration.
 */
export async function POST(
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
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }
    const { email, role } = parsed.data;

    const inviteeIsMember = await db.user.findUnique({
      where: { email },
      include: { members: { where: { tenantId }, select: { tenantId: true } } },
    });
    if (inviteeIsMember?.members.length) {
      return NextResponse.json(
        { error: "Ese email ya es miembro del tenant" },
        { status: 409 },
      );
    }

    const token = generateSessionToken();
    const invitation = await db.invitation.upsert({
      where: { tenantId_email: { tenantId, email } },
      create: {
        tenantId,
        email,
        role,
        tokenHash: hashToken(token),
        invitedById: ctx.user.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
      },
      // Re-invite regenerates the token and refreshes expiry/role.
      update: {
        role,
        tokenHash: hashToken(token),
        invitedById: ctx.user.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
        acceptedAt: null,
      },
    });

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
        // Shown only now — only the hash is stored server-side.
        acceptUrl: `/invite/${token}`,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[invitations:POST] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

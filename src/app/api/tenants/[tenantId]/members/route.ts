import { NextResponse } from "next/server";
import { findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";

/** GET — list members of a tenant (any member may view the team). */
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

  const members = await db.tenantMember.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json({
    members: members.map((m) => ({
      userId: m.userId,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      joinedAt: m.createdAt,
    })),
  });
}

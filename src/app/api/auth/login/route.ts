import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/session";
import { issuesOf, loginSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;
    const user = await db.user.findUnique({
      where: { email },
      include: {
        members: {
          include: {
            tenant: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Same generic error for unknown email / wrong password (no user enum).
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Email o contraseña incorrectos" },
        { status: 401 },
      );
    }

    const activeTenantId = user.members[0]?.tenantId ?? null;
    const token = await createSession(user.id, activeTenantId);
    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      activeTenantId,
      memberships: user.members.map((m) => ({
        tenantId: m.tenantId,
        role: m.role,
        tenant: m.tenant,
      })),
    });
  } catch (err) {
    console.error("[login] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

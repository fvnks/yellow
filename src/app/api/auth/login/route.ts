import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientIp, tooManyRequests } from "@/lib/http";
import { verifyPassword } from "@/lib/password";
import { RateLimiter } from "@/lib/rate-limit";
import { createSession, setSessionCookie } from "@/lib/session";
import { issuesOf, loginSchema } from "@/lib/validation";

// Brute-force protection: per-IP attempt cap, plus a failure counter
// per email account (successful logins never touch it).
const ipLimiter = new RateLimiter(20, 60_000);
const emailFailures = new RateLimiter(5, 600_000);

export async function POST(req: Request) {
  try {
    const ipWindow = ipLimiter.check(`login:ip:${clientIp(req)}`);
    if (!ipWindow.allowed) return tooManyRequests(ipWindow.retryAfterMs);

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
      const failure = emailFailures.check(`login:fail:${email}`);
      if (!failure.allowed) return tooManyRequests(failure.retryAfterMs);
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

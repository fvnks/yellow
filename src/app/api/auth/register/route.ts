import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientIp, tooManyRequests } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { RateLimiter } from "@/lib/rate-limit";
import { createSession, setSessionCookie } from "@/lib/session";
import { uniqueSlug } from "@/lib/slug";
import { issuesOf, registerSchema } from "@/lib/validation";

// Caps account/tenant creation spam per IP.
const ipLimiter = new RateLimiter(5, 600_000);

export async function POST(req: Request) {
  try {
    const ipWindow = ipLimiter.check(`register:ip:${clientIp(req)}`);
    if (!ipWindow.allowed) return tooManyRequests(ipWindow.retryAfterMs);

    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }

    const { email, password, name, tenantName } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const workspaceName = tenantName ?? `${name ?? email.split("@")[0]} workspace`;

    // User + first tenant (OWNER) + session in one transaction.
    const { user, tenant } = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name, passwordHash },
      });
      const tenant = await tx.tenant.create({
        data: { name: workspaceName, slug: uniqueSlug(workspaceName) },
      });
      await tx.tenantMember.create({
        data: { userId: user.id, tenantId: tenant.id, role: "OWNER" },
      });
      return { user, tenant };
    });

    const token = await createSession(user.id, tenant.id);
    await setSessionCookie(token);

    return NextResponse.json(
      {
        user: { id: user.id, email: user.email, name: user.name },
        activeTenantId: tenant.id,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[register] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

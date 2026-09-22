import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  generateSessionToken,
  hashToken,
  isExpired,
  sessionExpiry,
} from "@/lib/token";

export type SessionRecord = {
  id: string;
  userId: string;
  activeTenantId: string | null;
  expiresAt: Date;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export type Membership = {
  tenantId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  tenant: { id: string; name: string; slug: string };
};

export type AuthContext = {
  session: SessionRecord;
  user: AuthUser;
  memberships: Membership[];
};

/**
 * Creates a server-side session row (hashed token) and returns the raw
 * token to be set as an httpOnly cookie.
 */
export async function createSession(
  userId: string,
  activeTenantId: string | null = null,
): Promise<string> {
  const token = generateSessionToken();
  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      activeTenantId,
      expiresAt: sessionExpiry(),
    },
  });
  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  // Trust the reverse proxy's protocol. A Secure cookie sent over plain
  // HTTP is dropped by browsers/curl, which silently breaks login on
  // deployments without TLS. Over HTTPS (x-forwarded-proto: https) the
  // flag is always set.
  const proto = (await headers()).get("x-forwarded-proto");
  const secure =
    proto != null ? proto === "https" : process.env.NODE_ENV === "production";

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: sessionExpiry(),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Resolves the current request's session, or null when unauthenticated. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  if (!session) return null;
  if (isExpired(session.expiresAt)) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  const memberships = await db.tenantMember.findMany({
    where: { userId: session.userId },
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
    },
  });

  // If the active tenant no longer belongs to the user, fall back safely.
  let activeTenantId = session.activeTenantId;
  const stillMember =
    activeTenantId !== null &&
    memberships.some((m) => m.tenantId === activeTenantId);
  if (!stillMember) {
    activeTenantId = memberships[0]?.tenantId ?? null;
    if (activeTenantId !== session.activeTenantId) {
      await db.session
        .update({ where: { id: session.id }, data: { activeTenantId } })
        .catch(() => undefined);
    }
  }

  return {
    session: {
      id: session.id,
      userId: session.userId,
      activeTenantId,
      expiresAt: session.expiresAt,
    },
    user: session.user,
    memberships: memberships.map((m) => ({
      tenantId: m.tenantId,
      role: m.role,
      tenant: m.tenant,
    })),
  };
}

/** Destroys every session row for a user (used by logout). */
export async function revokeSessionByToken(token: string): Promise<void> {
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

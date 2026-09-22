import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "yellow_session";
export const SESSION_TTL_DAYS = 30;

/** Opaque, high-entropy token. Only its hash is ever persisted. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex digest of a session token (what we store in the DB). */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function isExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

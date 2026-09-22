import { describe, expect, it } from "vitest";
import {
  SESSION_TTL_DAYS,
  generateSessionToken,
  hashToken,
  isExpired,
  sessionExpiry,
} from "./token";

describe("session tokens", () => {
  it("generates high-entropy unique tokens", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43); // 32 bytes base64url
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/); // cookie-safe
  });

  it("hashes deterministically to a 64-char hex digest", () => {
    const token = generateSessionToken();
    const h1 = hashToken(token);
    const h2 = hashToken(token);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(generateSessionToken())).not.toBe(h1);
  });

  it("expires sessions after the TTL", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const exp = sessionExpiry(now);
    expect(exp.getTime() - now.getTime()).toBe(SESSION_TTL_DAYS * 86400_000);
    expect(isExpired(exp, now)).toBe(false);
    expect(isExpired(exp, exp)).toBe(true); // boundary: equal → expired
    expect(isExpired(now, exp)).toBe(true);
  });
});

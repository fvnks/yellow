import { describe, expect, it } from "vitest";
import { RateLimiter, clientIp } from "./rate-limit";

describe("RateLimiter", () => {
  it("allows up to the limit within the window", () => {
    const rl = new RateLimiter(3, 1000);
    const now = 1_000_000;
    expect(rl.check("k", now).allowed).toBe(true);
    expect(rl.check("k", now + 10).allowed).toBe(true);
    expect(rl.check("k", now + 20).allowed).toBe(true);
  });

  it("blocks the attempt over the limit and reports retry-after", () => {
    const rl = new RateLimiter(2, 1000);
    const now = 1_000_000;
    rl.check("k", now);
    rl.check("k", now + 500);
    const blocked = rl.check("k", now + 600);
    expect(blocked.allowed).toBe(false);
    // First hit expires at now+1000 → retry after 400ms.
    expect(blocked.retryAfterMs).toBe(400);
  });

  it("slides the window: old attempts expire", () => {
    const rl = new RateLimiter(2, 1000);
    const now = 1_000_000;
    rl.check("k", now);
    rl.check("k", now + 100);
    expect(rl.check("k", now + 200).allowed).toBe(false);
    // After the first two attempts leave the window, allow again.
    expect(rl.check("k", now + 1200).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const rl = new RateLimiter(1, 1000);
    const now = 1_000_000;
    expect(rl.check("a", now).allowed).toBe(true);
    expect(rl.check("a", now).allowed).toBe(false);
    expect(rl.check("b", now).allowed).toBe(true);
  });
});

describe("clientIp", () => {
  it("uses the first x-forwarded-for hop", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip, then 'unknown'", () => {
    const real = new Request("http://x", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(clientIp(real)).toBe("9.9.9.9");
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});

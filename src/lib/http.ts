import { NextResponse } from "next/server";
import { clientIp } from "./rate-limit";

/** 429 with a standard Retry-After header (seconds). */
export function tooManyRequests(retryAfterMs: number): NextResponse {
  const seconds = Math.max(Math.ceil(retryAfterMs / 1000), 1);
  return NextResponse.json(
    { error: "Demasiados intentos. Intenta más tarde." },
    { status: 429, headers: { "Retry-After": String(seconds) } },
  );
}

export { clientIp };

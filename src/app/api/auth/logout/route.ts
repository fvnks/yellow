import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearSessionCookie, revokeSessionByToken } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/token";

export async function POST() {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) await revokeSessionByToken(token);
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[logout] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

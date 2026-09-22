import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/session";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return NextResponse.json({
    user: ctx.user,
    activeTenantId: ctx.session.activeTenantId,
    memberships: ctx.memberships,
  });
}

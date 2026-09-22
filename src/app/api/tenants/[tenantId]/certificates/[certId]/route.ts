import { NextResponse } from "next/server";
import { canManageTenant, findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";

/**
 * DELETE — remove a stored certificate. If it was the active one, the
 * tenant falls back to mock mode (simulated emission). OWNER/ADMIN only.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tenantId: string; certId: string }> },
) {
  try {
    const { tenantId, certId } = await params;
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!findMembership(ctx, tenantId)) {
      return NextResponse.json({ error: "No eres miembro de este tenant" }, { status: 403 });
    }
    if (!canManageTenant(ctx, tenantId)) {
      return NextResponse.json(
        { error: "Se requiere rol OWNER o ADMIN" },
        { status: 403 },
      );
    }

    const existing = await db.siiCertificate.findFirst({
      where: { id: certId, tenantId },
      select: { id: true, active: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Certificado no encontrado" }, { status: 404 });
    }

    await db.siiCertificate.delete({ where: { id: certId } });
    return NextResponse.json({ success: true, eraActivo: existing.active });
  } catch (err) {
    console.error("[certificates:DELETE] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

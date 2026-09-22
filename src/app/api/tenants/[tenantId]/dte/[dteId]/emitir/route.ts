import { NextResponse } from "next/server";
import { findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { emitirDte, EmitError } from "@/lib/dte/emit";
import { getAuthContext } from "@/lib/session";

/**
 * POST — run the emission pipeline for a BORRADOR/FIRMADO document:
 * folio → TED → firma → envío → estado. Any member may emit.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ tenantId: string; dteId: string }> },
) {
  try {
    const { tenantId, dteId } = await params;
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!findMembership(ctx, tenantId)) {
      return NextResponse.json({ error: "No eres miembro de este tenant" }, { status: 403 });
    }

    const result = await emitirDte(tenantId, dteId);
    const documento = await db.dteDocument.findFirst({
      where: { id: dteId, tenantId },
      include: { items: { orderBy: { linea: "asc" } }, references: true },
    });

    return NextResponse.json({ resultado: result, documento });
  } catch (err) {
    if (err instanceof EmitError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[dte:emitir] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

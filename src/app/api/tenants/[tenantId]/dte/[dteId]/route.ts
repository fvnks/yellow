import { NextResponse } from "next/server";
import { findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";

/** GET — document detail with items, references and (once signed) the XML. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantId: string; dteId: string }> },
) {
  const { tenantId, dteId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!findMembership(ctx, tenantId)) {
    return NextResponse.json({ error: "No eres miembro de este tenant" }, { status: 403 });
  }

  const documento = await db.dteDocument.findFirst({
    where: { id: dteId, tenantId },
    include: { items: { orderBy: { linea: "asc" } }, references: true },
  });
  if (!documento) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ documento });
}

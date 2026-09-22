import { NextResponse } from "next/server";
import { canManageTenant, findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";

const detailInclude = {
  items: { orderBy: { linea: "asc" as const }, include: { categoria: true } },
  references: true,
  vendedor: true,
  costCenter: true,
};

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
    include: detailInclude,
  });
  if (!documento) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ documento });
}

/**
 * DELETE — remove a document. Ventas only while BORRADOR (any member);
 * compras (ENTRADA) require OWNER/ADMIN since they are accounting records.
 */
export async function DELETE(
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

    const documento = await db.dteDocument.findFirst({
      where: { id: dteId, tenantId },
      select: { id: true, sentido: true, estado: true },
    });
    if (!documento) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    if (documento.sentido === "ENTRADA") {
      if (!canManageTenant(ctx, tenantId)) {
        return NextResponse.json(
          { error: "Se requiere rol OWNER o ADMIN para eliminar compras" },
          { status: 403 },
        );
      }
    } else if (documento.estado !== "BORRADOR") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar borradores" },
        { status: 409 },
      );
    }

    await db.dteDocument.delete({ where: { id: dteId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[dte:DELETE] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

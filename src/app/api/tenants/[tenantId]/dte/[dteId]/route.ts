import { NextResponse } from "next/server";
import { canManageTenant, findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { classifyCompraSchema, issuesOf } from "@/lib/validation";

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

/**
 * PATCH — clasifica una compra (ENTRADA): asigna el centro de costo (área)
 * y aplica la categoría a todos sus ítems. "" limpia la dimensión;
 * omitirla la deja intacta. Cualquier miembro puede clasificar: es el
 * mismo poder de anotación que registrar la compra con esas dimensiones.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantId: string; dteId: string }> },
) {
  try {
    const { tenantId, dteId } = await params;
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!findMembership(ctx, tenantId)) {
      return NextResponse.json({ error: "No eres miembro de este tenant" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = classifyCompraSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const documento = await db.dteDocument.findFirst({
      where: { id: dteId, tenantId },
      select: { id: true, sentido: true },
    });
    if (!documento) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }
    if (documento.sentido !== "ENTRADA") {
      return NextResponse.json(
        { error: "Sólo se pueden clasificar compras (facturas recibidas)" },
        { status: 400 },
      );
    }

    if (data.costCenterId) {
      const centro = await db.centroCosto.findFirst({
        where: { id: data.costCenterId, tenantId },
        select: { id: true },
      });
      if (!centro) {
        return NextResponse.json({ error: "Centro de costo inválido" }, { status: 400 });
      }
    }
    if (data.categoriaId) {
      const categoria = await db.categoria.findFirst({
        where: { id: data.categoriaId, tenantId },
        select: { id: true },
      });
      if (!categoria) {
        return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
      }
    }

    const centroValor =
      data.costCenterId === undefined ? undefined : data.costCenterId || null;
    const categoriaValor =
      data.categoriaId === undefined ? undefined : data.categoriaId || null;

    await db.$transaction([
      ...(centroValor !== undefined
        ? [
            db.dteDocument.update({
              where: { id: dteId },
              data: { costCenterId: centroValor },
            }),
          ]
        : []),
      ...(categoriaValor !== undefined
        ? [
            db.dteItem.updateMany({
              where: { documentId: dteId },
              data: { categoryId: categoriaValor },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({
      ok: true,
      ...(centroValor !== undefined ? { costCenterId: centroValor } : {}),
      ...(categoriaValor !== undefined ? { categoriaId: categoriaValor } : {}),
    });
  } catch (err) {
    console.error("[dte:PATCH] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

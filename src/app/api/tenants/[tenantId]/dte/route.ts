import { NextResponse } from "next/server";
import { findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { computeTotals, lineTotal } from "@/lib/dte/totals";
import { getAuthContext } from "@/lib/session";
import { normalizeRut } from "@/lib/rut";
import { createDteSchema, issuesOf } from "@/lib/validation";

/**
 * GET — list documents of the tenant. Filters: ?sentido=SALIDA|ENTRADA,
 * ?estado=BORRADOR|…, ?tipo=33. Any member may view.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!findMembership(ctx, tenantId)) {
    return NextResponse.json({ error: "No eres miembro de este tenant" }, { status: 403 });
  }

  const url = new URL(req.url);
  const sentido = url.searchParams.get("sentido");
  const estado = url.searchParams.get("estado");
  const tipo = url.searchParams.get("tipo");

  const where: Record<string, unknown> = { tenantId };
  if (sentido === "SALIDA" || sentido === "ENTRADA") where.sentido = sentido;
  if (estado) where.estado = estado;
  if (tipo && /^\d+$/.test(tipo)) where.tipoDte = Number(tipo);

  const documentos = await db.dteDocument.findMany({
    where,
    orderBy: [{ fechaEmision: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      vendedor: { select: { id: true, nombre: true } },
      costCenter: { select: { id: true, codigo: true, nombre: true } },
    },
  });

  return NextResponse.json({ documentos });
}

/**
 * POST — create a draft document (BORRADOR). Totals are computed
 * server-side; any member of the tenant may create documents.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!findMembership(ctx, tenantId)) {
      return NextResponse.json({ error: "No eres miembro de este tenant" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = createDteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const esSalida = data.sentido === "SALIDA";

    // ── Dimension ownership: every reference must belong to this tenant ──
    if (data.vendedorId) {
      const vendedor = await db.vendedor.findFirst({
        where: { id: data.vendedorId, tenantId },
        select: { id: true },
      });
      if (!vendedor) {
        return NextResponse.json({ error: "Vendedor inválido" }, { status: 400 });
      }
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
    const categoryIds = [
      ...new Set(
        data.items
          .map((i) => i.categoryId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (categoryIds.length > 0) {
      const found = await db.categoria.findMany({
        where: { id: { in: categoryIds }, tenantId },
        select: { id: true },
      });
      if (found.length !== categoryIds.length) {
        return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
      }
    }

    const totals = computeTotals(
      data.tipoDte,
      data.items.map((i) => ({
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        descuento: i.descuento,
        afectoIva: i.afectoIva,
      })),
    );

    const documento = await db.dteDocument.create({
      data: {
        tenantId,
        sentido: data.sentido,
        tipoDte: data.tipoDte,
        folio: esSalida ? null : data.folio,
        fechaEmision: data.fechaEmision
          ? new Date(`${data.fechaEmision}T12:00:00`)
          : new Date(),
        // ── Receptor (customer) on ventas; provider on compras ──
        receptorRut: esSalida && data.receptorRut ? normalizeRut(data.receptorRut) : null,
        receptorRazonSocial: esSalida ? (data.receptorRazonSocial ?? null) : null,
        receptorGiro: esSalida ? (data.receptorGiro ?? null) : null,
        receptorDireccion: esSalida ? (data.receptorDireccion ?? null) : null,
        receptorComuna: esSalida ? (data.receptorComuna ?? null) : null,
        receptorEmail: esSalida ? (data.receptorEmail ?? null) : null,
        emisorRut: !esSalida && data.emisorRut ? normalizeRut(data.emisorRut) : null,
        emisorRazonSocial: esSalida ? null : (data.emisorRazonSocial ?? null),
        emisorGiro: esSalida ? null : (data.emisorGiro ?? null),
        // ── Commercial dimensions ──
        vendedorId: data.vendedorId ?? null,
        costCenterId: data.costCenterId ?? null,
        tipoTraslado: esSalida ? (data.tipoTraslado ?? null) : null,
        motivoTraslado: data.motivoTraslado ?? null,
        ...totals,
        estado: "BORRADOR",
        items: {
          create: data.items.map((item, index) => ({
            linea: index + 1,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            descuento: item.descuento,
            afectoIva: item.afectoIva,
            total: lineTotal(item),
            categoryId: item.categoryId ?? null,
          })),
        },
        ...(data.references?.length
          ? {
              references: {
                create: data.references.map((ref) => ({
                  tipoDteRef: ref.tipoDteRef,
                  folioRef: ref.folioRef,
                  fechaRef: ref.fechaRef
                    ? new Date(`${ref.fechaRef}T12:00:00`)
                    : null,
                  codigoRef: ref.codigoRef ?? null,
                  motivo: ref.motivo ?? null,
                })),
              },
            }
          : {}),
      },
      include: {
        items: { orderBy: { linea: "asc" }, include: { categoria: true } },
        references: true,
        vendedor: true,
        costCenter: true,
      },
    });

    return NextResponse.json({ documento }, { status: 201 });
  } catch (err) {
    console.error("[dte:POST] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { computeTotals, lineTotal } from "@/lib/dte/totals";
import { getAuthContext } from "@/lib/session";
import { createCotizacionSchema, issuesOf } from "@/lib/validation";

/** GET — cotizaciones del tenant (cualquier miembro). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!findMembership(ctx, tenantId)) {
    return NextResponse.json({ error: "No eres miembro de este tenant" }, { status: 403 });
  }

  const cotizaciones = await db.cotizacion.findMany({
    where: { tenantId },
    orderBy: [{ createdAt: "desc" }],
    include: { items: { orderBy: { linea: "asc" } } },
  });

  return NextResponse.json({ cotizaciones });
}

/**
 * POST — crea una cotización BORRADOR (cualquier miembro). El correlativo
 * por tenant se asigna acá; los totales se calculan en el servidor.
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
    const parsed = createCotizacionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Dimensión comercial: debe existir en el tenant (vendedor / centro).
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
      33,
      data.items.map((i) => ({
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        descuento: i.descuento,
        afectoIva: i.afectoIva,
      })),
    );

    const ultima = await db.cotizacion.aggregate({
      where: { tenantId },
      _max: { numero: true },
    });
    const numero = (ultima._max.numero ?? 0) + 1;

    const cotizacion = await db.cotizacion.create({
      data: {
        tenantId,
        numero,
        receptorRut: data.receptorRut,
        receptorRazonSocial: data.receptorRazonSocial,
        receptorGiro: data.receptorGiro ?? null,
        receptorComuna: data.receptorComuna ?? null,
        fecha: data.fecha ? new Date(`${data.fecha}T12:00:00`) : new Date(),
        validaHasta: data.validaHasta
          ? new Date(`${data.validaHasta}T12:00:00`)
          : null,
        comentario: data.comentario ?? null,
        vendedorId: data.vendedorId ?? null,
        costCenterId: data.costCenterId ?? null,
        neto: totals.neto,
        iva: totals.iva,
        total: totals.total,
        items: {
          create: data.items.map((item, index) => ({
            linea: index + 1,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            descuento: item.descuento,
            total: lineTotal(item),
            categoryId: item.categoryId ?? null,
          })),
        },
      },
      include: { items: { orderBy: { linea: "asc" } } },
    });

    return NextResponse.json({ cotizacion }, { status: 201 });
  } catch (err) {
    console.error("[cotizaciones:POST] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

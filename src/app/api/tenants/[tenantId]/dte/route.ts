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
        sentido: "SALIDA",
        tipoDte: data.tipoDte,
        fechaEmision: data.fechaEmision
          ? new Date(`${data.fechaEmision}T12:00:00`)
          : new Date(),
        receptorRut: normalizeRut(data.receptorRut),
        receptorRazonSocial: data.receptorRazonSocial,
        receptorGiro: data.receptorGiro ?? null,
        receptorDireccion: data.receptorDireccion ?? null,
        receptorComuna: data.receptorComuna ?? null,
        receptorEmail: data.receptorEmail ?? null,
        tipoTraslado: data.tipoTraslado ?? null,
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
      include: { items: { orderBy: { linea: "asc" } }, references: true },
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

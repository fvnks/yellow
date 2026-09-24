import { NextResponse } from "next/server";
import { findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { createGastoSchema, issuesOf } from "@/lib/validation";

/**
 * GET — gastos del tenant (cualquier miembro): lista con su categoría y
 * quién la registró, más el resumen de reembolsos.
 */
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

  const gastos = await db.gasto.findMany({
    where: { tenantId },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      categoria: { select: { id: true, nombre: true } },
      registradoPor: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ gastos });
}

/**
 * POST — registra un gasto de caja menor (cualquier miembro), con su
 * categoría y fecha de reembolso opcional.
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
    const parsed = createGastoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const categoria = await db.categoria.findFirst({
      where: { id: data.categoriaId, tenantId },
      select: { id: true },
    });
    if (!categoria) {
      return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
    }

    const gasto = await db.gasto.create({
      data: {
        tenantId,
        descripcion: data.descripcion,
        monto: data.monto,
        categoriaId: data.categoriaId,
        fecha: new Date(`${data.fecha}T12:00:00`),
        fechaReembolso: data.fechaReembolso
          ? new Date(`${data.fechaReembolso}T12:00:00`)
          : null,
        comentario: data.comentario ?? null,
        registradoPorId: ctx.user.id,
      },
      include: {
        categoria: { select: { id: true, nombre: true } },
        registradoPor: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ gasto }, { status: 201 });
  } catch (err) {
    console.error("[gastos:POST] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

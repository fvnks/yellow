import { NextResponse } from "next/server";
import { canManageTenant, findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { issuesOf, updateGastoSchema } from "@/lib/validation";

/**
 * PATCH — edita un gasto o marca/desmarca su reembolso (cualquier
 * miembro: mismo poder que registrarlo).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantId: string; gastoId: string }> },
) {
  try {
    const { tenantId, gastoId } = await params;
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!findMembership(ctx, tenantId)) {
      return NextResponse.json({ error: "No eres miembro de este tenant" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = updateGastoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const gasto = await db.gasto.findFirst({
      where: { id: gastoId, tenantId },
      select: { id: true },
    });
    if (!gasto) {
      return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
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

    const actualizado = await db.gasto.update({
      where: { id: gastoId },
      data: {
        ...(data.descripcion !== undefined ? { descripcion: data.descripcion } : {}),
        ...(data.monto !== undefined ? { monto: data.monto } : {}),
        ...(data.categoriaId !== undefined ? { categoriaId: data.categoriaId } : {}),
        ...(data.fecha !== undefined ? { fecha: new Date(`${data.fecha}T12:00:00`) } : {}),
        ...(data.fechaReembolso !== undefined
          ? {
              fechaReembolso:
                data.fechaReembolso === null
                  ? null
                  : new Date(`${data.fechaReembolso}T12:00:00`),
            }
          : {}),
        ...(data.comentario !== undefined ? { comentario: data.comentario || null } : {}),
      },
      include: {
        categoria: { select: { id: true, nombre: true } },
        registradoPor: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ gasto: actualizado });
  } catch (err) {
    console.error("[gasto:PATCH] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

/**
 * DELETE — elimina un gasto. Solo OWNER/ADMIN, coherente con las compras:
 * son anotaciones contables del equipo.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tenantId: string; gastoId: string }> },
) {
  try {
    const { tenantId, gastoId } = await params;
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!findMembership(ctx, tenantId)) {
      return NextResponse.json({ error: "No eres miembro de este tenant" }, { status: 403 });
    }
    if (!canManageTenant(ctx, tenantId)) {
      return NextResponse.json(
        { error: "Se requiere rol OWNER o ADMIN para eliminar gastos" },
        { status: 403 },
      );
    }

    const gasto = await db.gasto.findFirst({
      where: { id: gastoId, tenantId },
      select: { id: true },
    });
    if (!gasto) {
      return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
    }

    await db.gasto.delete({ where: { id: gastoId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[gasto:DELETE] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

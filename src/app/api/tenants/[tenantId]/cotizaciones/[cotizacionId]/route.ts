import { NextResponse } from "next/server";
import { canManageTenant, findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  transicionValida,
  type CotizacionEstado,
} from "@/lib/dte/cotizacion";
import { getAuthContext } from "@/lib/session";
import { issuesOf, updateCotizacionSchema } from "@/lib/validation";

/**
 * PATCH — cambia el estado de una cotización. Transiciones inválidas → 409
 * (no 500). Cualquier miembro puede avanzar el estado.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantId: string; cotizacionId: string }> },
) {
  try {
    const { tenantId, cotizacionId } = await params;
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!findMembership(ctx, tenantId)) {
      return NextResponse.json({ error: "No eres miembro de este tenant" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = updateCotizacionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }

    const cotizacion = await db.cotizacion.findFirst({
      where: { id: cotizacionId, tenantId },
      select: { id: true, estado: true },
    });
    if (!cotizacion) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }

    const desde = cotizacion.estado as CotizacionEstado;
    const hacia = parsed.data.estado;
    if (!transicionValida(desde, hacia)) {
      return NextResponse.json(
        {
          error: `No se puede pasar una cotización de ${desde} a ${hacia}`,
        },
        { status: 409 },
      );
    }

    const actualizada = await db.cotizacion.update({
      where: { id: cotizacionId },
      data: { estado: hacia },
      include: { items: { orderBy: { linea: "asc" } } },
    });

    return NextResponse.json({ cotizacion: actualizada });
  } catch (err) {
    console.error("[cotizacion:PATCH] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

/**
 * DELETE — elimina una cotización. BORRADOR la puede borrar cualquier
 * miembro; los demás estados requieren OWNER/ADMIN (queda registro de lo
 * que se envió o aceptó).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tenantId: string; cotizacionId: string }> },
) {
  try {
    const { tenantId, cotizacionId } = await params;
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!findMembership(ctx, tenantId)) {
      return NextResponse.json({ error: "No eres miembro de este tenant" }, { status: 403 });
    }

    const cotizacion = await db.cotizacion.findFirst({
      where: { id: cotizacionId, tenantId },
      select: { id: true, estado: true },
    });
    if (!cotizacion) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }

    const esBorrador = cotizacion.estado === "BORRADOR";
    if (!esBorrador && !canManageTenant(ctx, tenantId)) {
      return NextResponse.json(
        { error: "Solo OWNER o ADMIN pueden eliminar cotizaciones ya tramitadas" },
        { status: 403 },
      );
    }

    await db.cotizacion.delete({ where: { id: cotizacionId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cotizacion:DELETE] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

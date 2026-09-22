import { NextResponse } from "next/server";
import { canManageTenant, findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/session";
import { normalizeRut } from "@/lib/rut";
import { issuesOf, updateEmisorSchema } from "@/lib/validation";

/**
 * PUT — partial update of the tenant's emisor SII profile
 * (razón social, RUT, giro, actividad, dirección, resolución).
 * OWNER/ADMIN only.
 */
export async function PUT(
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
    if (!canManageTenant(ctx, tenantId)) {
      return NextResponse.json(
        { error: "Se requiere rol OWNER o ADMIN" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = updateEmisorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }

    const updated = await db.tenant.update({
      where: { id: tenantId },
      data: {
        ...parsed.data,
        ...(parsed.data.rut ? { rut: normalizeRut(parsed.data.rut) } : {}),
        ...(parsed.data.resolucionFecha
          ? { resolucionFecha: new Date(`${parsed.data.resolucionFecha}T12:00:00`) }
          : {}),
      },
      select: {
        id: true,
        rut: true,
        razonSocial: true,
        giro: true,
        actividadEconomica: true,
        direccion: true,
        comuna: true,
        emailSii: true,
        resolucionFecha: true,
        resolucionNumero: true,
      },
    });

    return NextResponse.json({ tenant: updated });
  } catch (err) {
    console.error("[profile:PUT] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

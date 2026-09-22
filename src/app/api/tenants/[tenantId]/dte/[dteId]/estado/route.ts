import { NextResponse } from "next/server";
import { findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { assertTransition } from "@/lib/dte/state";
import { getAuthContext } from "@/lib/session";
import { createSiiAdapters, type EstadoEnvio } from "@/lib/sii";

/**
 * POST — ask the SII for the fate of an already-sent document (track ID)
 * and persist ACEPTADO/RECHAZADO when it has decided. Any member may
 * consult, mirroring the emission permission. While the SII is still
 * processing (`PENDIENTE`), the document stays ENVIADO.
 */
export async function POST(
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

    const doc = await db.dteDocument.findFirst({
      where: { id: dteId, tenantId },
      select: { id: true, estado: true, trackId: true, sentido: true },
    });
    if (!doc) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }
    if (doc.sentido !== "SALIDA") {
      return NextResponse.json(
        { error: "Solo se consulta el estado de documentos de salida" },
        { status: 400 },
      );
    }
    if (doc.estado !== "ENVIADO" || !doc.trackId) {
      return NextResponse.json(
        { error: `Solo se consulta un documento ENVIADO (estado actual: ${doc.estado})` },
        { status: 409 },
      );
    }

    let resultado: { estado: EstadoEnvio; glosa?: string };
    try {
      const adapters = await createSiiAdapters(tenantId);
      resultado = await adapters.client.consultarEstado(doc.trackId);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error("[dte:estado] sii error", err);
      return NextResponse.json(
        { error: `No se pudo consultar el SII: ${detail}` },
        { status: 502 },
      );
    }

    let actualizado = false;
    const siiEstado = resultado.estado;
    if (siiEstado !== "PENDIENTE") {
      assertTransition("ENVIADO", siiEstado);
      await db.dteDocument.update({
        where: { id: doc.id },
        data: {
          estado: siiEstado,
          siiResponse: resultado.glosa ?? null,
        },
      });
      actualizado = true;
    }

    return NextResponse.json({
      estado: actualizado ? siiEstado : doc.estado,
      siiEstado,
      glosa: resultado.glosa ?? null,
      actualizado,
    });
  } catch (err) {
    console.error("[dte:estado] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

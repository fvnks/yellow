import { NextResponse } from "next/server";
import { findMembership } from "@/lib/authz";
import { DecryptError } from "@/lib/crypto";
import { csvDelPeriodo, registroDelPeriodo } from "@/lib/dte/descarga";
import { periodoBounds } from "@/lib/dte/libro-periodo";
import { PortalError } from "@/lib/sii/portal";
import { getAuthContext } from "@/lib/session";

/**
 * GET — registro de compras/ventas del periodo. Cualquier miembro puede.
 * El botón «Registro CSV» vive en /libros; el XML/PDF de cada documento
 * se descarga desde su fila (Facturación/Compras).
 *
 * Query:
 *   ?periodo=AAAA-MM            (obligatorio)
 *   ?sentido=SALIDA|ENTRADA     (defecto SALIDA)
 *   ?formato=json|csv           (defecto json)
 *
 * - json: registro completo del periodo (modo, documentos, aviso)
 * - csv:  exportación del registro (en modo real es la del SII mismo)
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
  const periodo = url.searchParams.get("periodo") ?? "";
  const sentido = url.searchParams.get("sentido") === "ENTRADA" ? "ENTRADA" : "SALIDA";
  const formato = url.searchParams.get("formato") ?? "json";
  const lado = sentido === "ENTRADA" ? "compras" : "ventas";

  if (!periodoBounds(periodo)) {
    return NextResponse.json(
      { error: `Periodo inválido: "${periodo}" (se espera AAAA-MM).` },
      { status: 400 },
    );
  }

  // ── CSV del registro ──
  if (formato === "csv") {
    try {
      const csv = await csvDelPeriodo(tenantId, sentido, periodo);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="registro-${lado}-${periodo}.csv"`,
        },
      });
    } catch (err) {
      return errRespuesta(err);
    }
  }

  if (formato !== "json") {
    return NextResponse.json(
      { error: `Formato no soportado: "${formato}" (usa json o csv; el XML/PDF de cada documento se descarga desde su fila).` },
      { status: 400 },
    );
  }

  // ── Registro JSON ──
  try {
    const registro = await registroDelPeriodo(tenantId, sentido, periodo);
    return NextResponse.json(registro);
  } catch (err) {
    return errRespuesta(err);
  }
}

/** Errores de dominio → respuesta HTTP honesta. */
function errRespuesta(err: unknown): NextResponse {
  if (err instanceof PortalError) {
    return NextResponse.json(
      { error: err.message, codigo: err.codigo },
      { status: 502 },
    );
  }
  if (err instanceof DecryptError) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  if (err instanceof Error && err.message.startsWith("Periodo inválido")) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error("[descargas] unexpected error", err);
  return NextResponse.json(
    { error: "Error interno. Intenta nuevamente." },
    { status: 500 },
  );
}

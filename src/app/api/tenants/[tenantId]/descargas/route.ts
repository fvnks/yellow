import { NextResponse } from "next/server";
import { findMembership } from "@/lib/authz";
import { DecryptError } from "@/lib/crypto";
import { csvDelPeriodo, registroDelPeriodo, xmlDelPeriodo } from "@/lib/dte/descarga";
import { pdfDesdeXml, PdfError } from "@/lib/dte/pdf";
import { periodoBounds } from "@/lib/dte/libro-periodo";
import { PortalError } from "@/lib/sii/portal";
import { getAuthContext } from "@/lib/session";

/**
 * GET — descargas del SII desde /descargas. Cualquier miembro puede.
 *
 * Query:
 *   ?periodo=AAAA-MM            (obligatorio)
 *   ?sentido=SALIDA|ENTRADA     (defecto SALIDA)
 *   ?formato=json|csv|xml|pdf   (defecto json; xml/pdf llevan además
 *                                ?tipo=33&folio=1004)
 *
 * - json: registro completo del periodo (modo, documentos, aviso)
 * - csv:  exportación del registro (en modo real es la del SII mismo)
 * - xml:  el DTE firmado local (null → 404 con el motivo honesto)
 * - pdf:  representación impresa generada desde ese XML
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

  // ── XML / PDF de un documento puntual ──
  if (formato === "xml" || formato === "pdf") {
    const tipo = Number(url.searchParams.get("tipo"));
    const folio = Number(url.searchParams.get("folio"));
    if (!Number.isInteger(tipo) || !Number.isInteger(folio) || tipo <= 0 || folio <= 0) {
      return NextResponse.json(
        { error: "Se requiere ?tipo y ?folio válidos" },
        { status: 400 },
      );
    }

    let xml: string | null;
    try {
      xml = await xmlDelPeriodo(tenantId, sentido, periodo, tipo, folio);
    } catch (err) {
      return errRespuesta(err);
    }
    if (!xml) {
      return NextResponse.json(
        {
          error: `XML del documento ${tipo} N° ${folio} no está en Yellow`,
          motivo:
            "El XML de terceros (y de documentos emitidos fuera de Yellow) sólo se sirve desde el portal del SII.",
        },
        { status: 404 },
      );
    }

    if (formato === "xml") {
      return new NextResponse(Buffer.from(xml, "latin1"), {
        headers: {
          "Content-Type": "application/xml; charset=ISO-8859-1",
          "Content-Disposition": `attachment; filename="dte-${tipo}-${folio}.xml"`,
        },
      });
    }

    try {
      const pdf = pdfDesdeXml(xml);
      return new NextResponse(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="dte-${tipo}-${folio}.pdf"`,
        },
      });
    } catch (err) {
      if (err instanceof PdfError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      return errRespuesta(err);
    }
  }

  // ── Registro JSON (lo consume la página y los refrescos del cliente) ──
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

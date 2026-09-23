import { NextResponse } from "next/server";
import { findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { chileDate } from "@/lib/dte/emit";
import { buildLibroXml } from "@/lib/dte/libro";
import {
  documentosDelPeriodo,
  nombreLibro,
  periodoBounds,
  sentidoLibro,
} from "@/lib/dte/libro-periodo";
import { getAuthContext } from "@/lib/session";

/**
 * GET — descarga el Libro de Compras y Ventas del periodo en el XML
 * oficial del SII (LibroCVS_v10.xsd), listo para subir en Declaraciones
 * Juradas → Upload XML de libros de compra y venta.
 *
 * Query: ?periodo=AAAA-MM (obligatorio), ?sentido=SALIDA|ENTRADA (def. SALIDA).
 * Cualquier miembro del tenant puede descargarlo.
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

  if (!periodoBounds(periodo)) {
    return NextResponse.json(
      { error: `Periodo inválido: "${periodo}" (se espera AAAA-MM).` },
      { status: 400 },
    );
  }

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { rut: true, resolucionFecha: true, resolucionNumero: true },
  });
  if (!tenant?.rut) {
    return NextResponse.json(
      { error: "Completa el perfil del emisor: falta el RUT." },
      { status: 400 },
    );
  }
  if (!tenant.resolucionFecha || tenant.resolucionNumero == null) {
    return NextResponse.json(
      { error: "Completa la resolución del SII en el perfil del emisor: fecha y número." },
      { status: 400 },
    );
  }

  const documentos = await documentosDelPeriodo(tenantId, sentido, periodo);

  let xml: string;
  try {
    xml = buildLibroXml({
      sentido: sentidoLibro(sentido),
      periodo,
      rutEmisor: tenant.rut,
      fechaResolucion: chileDate(tenant.resolucionFecha),
      numeroResolucion: tenant.resolucionNumero,
      documentos,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo generar el libro" },
      { status: 400 },
    );
  }

  return new NextResponse(Buffer.from(xml, "latin1"), {
    headers: {
      "Content-Type": "application/xml; charset=ISO-8859-1",
      "Content-Disposition": `attachment; filename="${nombreLibro(sentido, periodo)}"`,
    },
  });
}

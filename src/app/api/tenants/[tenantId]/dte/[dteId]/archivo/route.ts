import { NextResponse } from "next/server";
import { findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { chileDate } from "@/lib/dte/emit";
import { motivoXml } from "@/lib/dte/descarga";
import {
  ETIQUETA_TIPO,
  pdfDesdeDatos,
  pdfDesdeXml,
  PdfError,
  type DatosDte,
} from "@/lib/dte/pdf";
import { formatRutDv } from "@/lib/rut";
import { getAuthContext } from "@/lib/session";

/**
 * GET — descarga el archivo de un documento puntual, por ID:
 *
 *   /api/tenants/{tenant}/dte/{id}/archivo?formato=xml|pdf
 *
 * - xml: el DTE firmado almacenado en Yellow; sin XML → 404 con el
 *   motivo honesto (compras: sólo el portal del SII; borrador: aún no
 *   firmado).
 * - pdf: representación impresa desde el XML cuando existe; si no,
 *   desde el registro local (compras de terceros con folio). Sin folio
 *   ni XML (borrador de venta) → 404: aún no hay DTE.
 *
 * Cualquier miembro del tenant puede descargar.
 */

type DocArchivo = NonNullable<
  Awaited<ReturnType<typeof cargarDocumento>>
>;

async function cargarDocumento(tenantId: string, dteId: string) {
  return db.dteDocument.findFirst({
    where: { id: dteId, tenantId },
    include: {
      tenant: true,
      items: { orderBy: { linea: "asc" } },
      references: true,
    },
  });
}

/** Perfil del tenant como emisor (SALIDA sin XML almacenado). */
function emisorDeTenant(t: DocArchivo["tenant"]) {
  return {
    rut: t.rut ? formatRutDv(t.rut) : "",
    razonSocial: t.razonSocial ?? t.name,
    giro: t.giro ?? "",
    direccion: t.direccion ?? "",
    comuna: t.comuna ?? "",
  };
}

/**
 * Mapeo del registro estructurado → datos de la representación impresa.
 * ENTRADA: emisor = proveedor, receptor = este tenant. SALIDA (borrador
 * con folio pero sin XML): los papeles se invierten.
 */
function datosDesdeDocumento(doc: DocArchivo): DatosDte {
  const emisor =
    doc.sentido === "ENTRADA"
      ? {
          rut: doc.emisorRut ? formatRutDv(doc.emisorRut) : "",
          razonSocial: doc.emisorRazonSocial ?? "",
          giro: doc.emisorGiro ?? "",
          direccion: "",
          comuna: "",
        }
      : emisorDeTenant(doc.tenant);
  const receptor =
    doc.sentido === "ENTRADA"
      ? emisorDeTenant(doc.tenant)
      : {
          rut: doc.receptorRut ? formatRutDv(doc.receptorRut) : "",
          razonSocial: doc.receptorRazonSocial ?? "",
          giro: doc.receptorGiro ?? "",
          direccion: doc.receptorDireccion ?? "",
          comuna: doc.receptorComuna ?? "",
        };

  return {
    tipoDte: doc.tipoDte,
    folio: doc.folio ?? 0,
    fecha: chileDate(doc.fechaEmision),
    emisor,
    receptor,
    totales: { neto: doc.neto, mntExe: doc.mntExe, iva: doc.iva, total: doc.total },
    items: doc.items.map((i) => ({
      nombre: i.nombre,
      cantidad: Number(i.cantidad),
      precioUnitario: i.precioUnitario,
      // Neto por línea (ya descontado), igual que MontoItem en el XML.
      monto: i.total,
    })),
    referencias: doc.references.map((r) => {
      const etiqueta = ETIQUETA_TIPO[r.tipoDteRef] ?? `Tipo ${r.tipoDteRef}`;
      return `${etiqueta} N° ${r.folioRef}${r.motivo ? ` - ${r.motivo}` : ""}`;
    }),
    tmstFirma: "",
  };
}

/** Genera el PDF y lo sirve como descarga; PdfError → 400 honesto. */
function responderPdf(generar: () => Buffer, filename: string): NextResponse {
  try {
    const pdf = generar();
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof PdfError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantId: string; dteId: string }> },
) {
  try {
    const { tenantId, dteId } = await params;
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!findMembership(ctx, tenantId)) {
      return NextResponse.json({ error: "No eres miembro de este tenant" }, { status: 403 });
    }

    const doc = await cargarDocumento(tenantId, dteId);
    if (!doc) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    const url = new URL(req.url);
    const formato = url.searchParams.get("formato") === "pdf" ? "pdf" : "xml";
    const nombre = `dte-${doc.tipoDte}-${doc.folio ?? "borrador"}`;

    if (formato === "xml") {
      const xml = doc.xml;
      if (!xml) {
        return NextResponse.json(
          {
            error: `XML del documento ${doc.tipoDte} N° ${doc.folio ?? "—"} no está en Yellow`,
            motivo:
              doc.folio == null
                ? "El documento es un borrador: aún no está firmado ni tiene XML."
                : motivoXml(doc.sentido),
          },
          { status: 404 },
        );
      }
      return new NextResponse(Buffer.from(xml, "latin1"), {
        headers: {
          "Content-Type": "application/xml; charset=ISO-8859-1",
          "Content-Disposition": `attachment; filename="${nombre}.xml"`,
        },
      });
    }

    // ── PDF: del XML firmado si existe; si no, del registro local ──
    const xml = doc.xml;
    if (xml) return responderPdf(() => pdfDesdeXml(xml), `${nombre}.pdf`);
    if (doc.folio == null) {
      return NextResponse.json(
        {
          error: "El documento no tiene folio ni XML",
          motivo: "Es un borrador: aún no hay un DTE que representar.",
        },
        { status: 404 },
      );
    }
    const datos = datosDesdeDocumento(doc);
    return responderPdf(() => pdfDesdeDatos(datos), `${nombre}.pdf`);
  } catch (err) {
    console.error("[archivo] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

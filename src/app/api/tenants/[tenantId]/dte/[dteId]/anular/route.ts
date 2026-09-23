import { NextResponse } from "next/server";
import { canManageTenant } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  cartaAnulacion,
  metodosAnulacion,
  motivoAnulado,
  tipoNotaCompensatoria,
} from "@/lib/dte/anulacion";
import { chileDate, emitirDte } from "@/lib/dte/emit";
import { assertTransition } from "@/lib/dte/state";
import { formatRutDv } from "@/lib/rut";
import { getAuthContext } from "@/lib/session";
import { createSiiAdapters, type SiiAdapters } from "@/lib/sii";
import { anularDteSchema, issuesOf } from "@/lib/validation";

/** Re-fetch the document (with lines + references) after a state change. */
async function refetch(tenantId: string, dteId: string) {
  return db.dteDocument.findFirst({
    where: { id: dteId, tenantId },
    include: { items: { orderBy: { linea: "asc" } }, references: true },
  });
}

function mensajeNoPermitido(
  estado: string,
  tipoDte: number,
  metodo: "nc" | "directa",
): string {
  if (estado === "ACEPTADO" && metodo === "nc" && tipoDte === 52) {
    return "Las guías de despacho no se anulan con nota: usa la anulación directa (queda registrada en el Libro de Guías).";
  }
  if (estado === "FIRMADO" && metodo === "nc") {
    return "El SII aún no acepta el documento: anula el folio (método directa) o consulta el estado primero.";
  }
  switch (estado) {
    case "BORRADOR":
      return "El borrador no consume folio: elimínalo en su lugar.";
    case "ENVIADO":
      return "El SII aún no responde: usa «Consultar estado». Si lo rechaza, no requiere anulación.";
    case "RECHAZADO":
      return "Un documento rechazado por el SII no requiere anulación.";
    case "ANULADO":
      return "El documento ya está anulado.";
    default:
      return `No se puede anular un documento en estado ${estado}.`;
  }
}

/**
 * POST — anular un documento de SALIDA con elección de método
 * (FAQ oficial del SII 001.003.2167.006):
 *
 *   metodo "nc"      → crea y emite la nota compensatoria (61 ↔ 56) con
 *                      CodRef=1; si el SII no la rechaza, el original
 *                      pasa a ANULADO. Sólo documentos ACEPTADO.
 *   metodo "directa" → FIRMADO: anula el folio ante el SII (adaptador
 *                      mock → real apenas exista un .p12 activo);
 *                      ACEPTADO 52: anulación local (Libro de Guías);
 *                      ACEPTADO (resto): carta de anulación descargable.
 *
 * OWNER/ADMIN únicamente: impacta el libro de ventas.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantId: string; dteId: string }> },
) {
  try {
    const { tenantId, dteId } = await params;
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!canManageTenant(ctx, tenantId)) {
      return NextResponse.json(
        { error: "Sólo administradores del tenant pueden anular documentos" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = anularDteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }
    const { metodo, motivo } = parsed.data;

    const doc = await refetch(tenantId, dteId);
    if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    if (doc.sentido !== "SALIDA") {
      return NextResponse.json(
        { error: "Sólo se anulan documentos de venta (salida)" },
        { status: 400 },
      );
    }
    if (!metodosAnulacion(doc.estado, doc.tipoDte).includes(metodo)) {
      return NextResponse.json(
        { error: mensajeNoPermitido(doc.estado, doc.tipoDte, metodo) },
        { status: 409 },
      );
    }
    if (doc.folio == null) {
      return NextResponse.json(
        { error: "Inconsistencia: el documento no tiene folio asignado" },
        { status: 409 },
      );
    }

    // ── "nc": crea y emite la nota que anula este documento ──
    if (metodo === "nc") {
      const notaTipo = tipoNotaCompensatoria(doc.tipoDte);
      if (!notaTipo) {
        return NextResponse.json(
          { error: mensajeNoPermitido(doc.estado, doc.tipoDte, metodo) },
          { status: 409 },
        );
      }
      const nota = await db.dteDocument.create({
        data: {
          tenantId,
          sentido: "SALIDA",
          tipoDte: notaTipo,
          fechaEmision: new Date(),
          receptorRut: doc.receptorRut,
          receptorRazonSocial: doc.receptorRazonSocial,
          receptorGiro: doc.receptorGiro,
          receptorDireccion: doc.receptorDireccion,
          receptorComuna: doc.receptorComuna,
          receptorEmail: doc.receptorEmail,
          vendedorId: doc.vendedorId,
          costCenterId: doc.costCenterId,
          neto: doc.neto,
          mntExe: doc.mntExe,
          iva: doc.iva,
          total: doc.total,
          items: {
            create: doc.items.map((i) => ({
              linea: i.linea,
              nombre: i.nombre,
              cantidad: i.cantidad,
              precioUnitario: i.precioUnitario,
              descuento: i.descuento,
              afectoIva: i.afectoIva,
              total: i.total,
              categoryId: i.categoryId,
            })),
          },
          references: {
            create: [
              {
                tipoDteRef: doc.tipoDte,
                folioRef: doc.folio,
                fechaRef: doc.fechaEmision,
                codigoRef: 1,
                motivo,
              },
            ],
          },
        },
      });

      let advertencia: string | null = null;
      let folioNota: number | null = null;
      try {
        const res = await emitirDte(tenantId, nota.id);
        folioNota = res.folio;
        if (res.estado === "RECHAZADO") {
          advertencia =
            "El SII rechazó la nota recién emitida: el documento original sigue ACEPTADO. Revisa el motivo y reintenta.";
        } else {
          assertTransition("ACEPTADO", "ANULADO");
          await db.dteDocument.update({
            where: { id: doc.id },
            data: {
              estado: "ANULADO",
              motivoAnulacion: motivoAnulado(
                `${notaTipo === 56 ? "ND" : "NC"} N° ${res.folio}`,
                motivo,
              ),
            },
          });
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        advertencia = `La nota se creó como borrador pero no se pudo emitir: ${detail}. Emítela desde la lista para completar la anulación.`;
      }

      const etiqueta = notaTipo === 56 ? "N. débito" : "N. crédito";
      const mensaje =
        advertencia ??
        `Anulación: emitida ${etiqueta} N° ${folioNota} — documento N° ${doc.folio} anulado.`;
      // Re-fetch: emitirDte avanzó la nota (folio/estado) tras el create.
      return NextResponse.json({
        mensaje,
        advertencia,
        nota: (await refetch(tenantId, nota.id)) ?? nota,
        documento: (await refetch(tenantId, doc.id)) ?? doc,
      });
    }

    // ── "directa": folio sin enviar, guía local o carta ──
    if (doc.estado === "FIRMADO") {
      let adapters: SiiAdapters;
      try {
        adapters = await createSiiAdapters(tenantId);
      } catch (err) {
        return NextResponse.json(
          {
            error: `No se pudo preparar el SII: ${err instanceof Error ? err.message : String(err)}`,
          },
          { status: 422 },
        );
      }

      let resultado: { ok: boolean; glosa?: string };
      try {
        resultado = await adapters.client.anularFolio({
          tipoDte: doc.tipoDte,
          folio: doc.folio,
        });
      } catch (err) {
        return NextResponse.json(
          {
            error: `El SII no procesó la anulación del folio: ${err instanceof Error ? err.message : String(err)}`,
          },
          { status: 502 },
        );
      }
      if (!resultado.ok) {
        return NextResponse.json(
          { error: `El SII no anuló el folio: ${resultado.glosa ?? "sin detalle"}` },
          { status: 502 },
        );
      }

      assertTransition("FIRMADO", "ANULADO");
      await db.dteDocument.update({
        where: { id: doc.id },
        data: {
          estado: "ANULADO",
          motivoAnulacion: motivoAnulado(
            `Folio anulado ante el SII (${resultado.glosa ?? "OK"})`,
            motivo,
          ),
        },
      });
      return NextResponse.json({
        mensaje:
          `Folio N° ${doc.folio} anulado ante el SII — ` +
          (adapters.modo === "mock"
            ? "modo simulado: se hará real con un .p12 activo."
            : "producción."),
        advertencia: null,
        modo: adapters.modo,
        documento: (await refetch(tenantId, doc.id)) ?? doc,
      });
    }

    // Aceptada: la guía no se informa al SII…
    if (doc.tipoDte === 52) {
      assertTransition("ACEPTADO", "ANULADO");
      await db.dteDocument.update({
        where: { id: doc.id },
        data: {
          estado: "ANULADO",
          motivoAnulacion: motivoAnulado(
            "Anulación directa: la guía no se informa al SII",
            motivo,
          ),
        },
      });
      return NextResponse.json({
        mensaje: `Guía N° ${doc.folio} anulada — regístrala en el Libro de Guías (el SII no exige aviso).`,
        advertencia: null,
        modo: null,
        documento: (await refetch(tenantId, doc.id)) ?? doc,
      });
    }

    // …el resto de aceptados se anula con carta para el SII.
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.rut || !tenant.razonSocial) {
      return NextResponse.json(
        { error: "Completa el perfil de emisor (RUT y razón social) para generar la carta" },
        { status: 422 },
      );
    }
    const carta = cartaAnulacion({
      emisor: {
        rut: formatRutDv(tenant.rut),
        razonSocial: tenant.razonSocial,
        giro: tenant.giro,
      },
      receptorRazonSocial: doc.receptorRazonSocial,
      tipoDte: doc.tipoDte,
      folio: doc.folio,
      fechaEmision: chileDate(doc.fechaEmision),
      total: doc.total,
      motivo,
    });
    assertTransition("ACEPTADO", "ANULADO");
    await db.dteDocument.update({
      where: { id: doc.id },
      data: {
        estado: "ANULADO",
        motivoAnulacion: motivoAnulado("Carta de anulación generada", motivo),
      },
    });
    return NextResponse.json({
      mensaje: `Documento N° ${doc.folio} anulado con carta: descárgala y preséntala ante el SII.`,
      advertencia: null,
      modo: null,
      carta,
      documento: (await refetch(tenantId, doc.id)) ?? doc,
    });
  } catch (err) {
    console.error("[dte:anular] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

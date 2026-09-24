import { NextResponse } from "next/server";
import { findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { convertible, type CotizacionEstado } from "@/lib/dte/cotizacion";
import { getAuthContext } from "@/lib/session";

/**
 * POST — convierte una cotización en la factura de venta (DTE BORRADOR,
 * sin folio hasta emitir). Repite receptor, ítems y dimensiones
 * comerciales; la cotización queda CONVERTIDA con la referencia al DTE.
 */
export async function POST(
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
      include: { items: { orderBy: { linea: "asc" } } },
    });
    if (!cotizacion) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    }
    if (!convertible(cotizacion.estado as CotizacionEstado)) {
      return NextResponse.json(
        {
          error:
            cotizacion.estado === "CONVERTIDA"
              ? "La cotización ya fue convertida"
              : "No se puede convertir una cotización rechazada",
        },
        { status: 409 },
      );
    }

    // El DTE hereda los totales ya calculados de la cotización.
    const documento = await db.dteDocument.create({
      data: {
        tenantId,
        sentido: "SALIDA",
        tipoDte: 33,
        folio: null,
        fechaEmision: new Date(),
        receptorRut: cotizacion.receptorRut,
        receptorRazonSocial: cotizacion.receptorRazonSocial,
        receptorGiro: cotizacion.receptorGiro,
        receptorComuna: cotizacion.receptorComuna,
        vendedorId: cotizacion.vendedorId,
        costCenterId: cotizacion.costCenterId,
        neto: cotizacion.neto,
        iva: cotizacion.iva,
        total: cotizacion.total,
        estado: "BORRADOR",
        items: {
          create: cotizacion.items.map((item) => ({
            linea: item.linea,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            descuento: item.descuento,
            afectoIva: true,
            total: item.total,
            categoryId: item.categoryId,
          })),
        },
      },
      include: {
        items: { orderBy: { linea: "asc" } },
        vendedor: true,
        costCenter: true,
      },
    });

    const actualizada = await db.cotizacion.update({
      where: { id: cotizacionId },
      data: { estado: "CONVERTIDA", dteId: documento.id },
      include: { items: { orderBy: { linea: "asc" } } },
    });

    return NextResponse.json(
      { cotizacion: actualizada, documento },
      { status: 201 },
    );
  } catch (err) {
    console.error("[cotizacion:convertir] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

/**
 * Emission pipeline: BORRADOR → FIRMADO → ENVIADO → ACEPTADO/RECHAZADO.
 *
 * Steps: validate emisor profile → allocate folio from the CAF (atomic
 * claim) → stamp the TED with the CAF's RSASK → build the DTE XML → sign
 * it (certificate adapter) → wrap in `<EnvioDTE>` → upload → query state.
 * Every step persists its outcome so a failure can be resumed: emission
 * can restart from BORRADOR or FIRMADO (folio never reused).
 */

import { db } from "@/lib/db";
import { formatRutDv, normalizeRut } from "@/lib/rut";
import { createDteSigner, createSiiClient } from "@/lib/sii";
import { parseCaf } from "./caf";
import { assertTransition, canEmitir, type DteEstado } from "./state";
import { computeTotals, lineTotal } from "./totals";
import { buildTed } from "./ted";
import { buildDteXml, buildEnvioDte } from "./xml";

export class EmitError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = "EmitError";
  }
}

const EMISOR_REQUIRED = [
  "rut",
  "razonSocial",
  "giro",
  "actividadEconomica",
  "direccion",
  "comuna",
] as const;

/** Date in America/Santiago, format YYYY-MM-DD (SII convention). */
export function chileDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(date);
}

/** UTC timestamp without offset: YYYY-MM-DDTHH:MM:SS (TmstFirma/TED). */
function nowStamp(): string {
  return new Date().toISOString().slice(0, 19);
}

export interface EmitResult {
  estado: DteEstado;
  folio: number;
  trackId: string;
}

export async function emitirDte(
  tenantId: string,
  documentId: string,
): Promise<EmitResult> {
  const doc = await db.dteDocument.findFirst({
    where: { id: documentId, tenantId },
    include: { items: { orderBy: { linea: "asc" } }, references: true },
  });
  if (!doc) throw new EmitError("Documento no encontrado", 404);
  if (doc.sentido !== "SALIDA") {
    throw new EmitError("Solo se emiten documentos de salida", 400);
  }
  if (!canEmitir(doc.estado as DteEstado)) {
    throw new EmitError(`No se puede emitir un documento en estado ${doc.estado}`, 409);
  }
  // Receptor is required for emission (guaranteed by createDteSchema for
  // SALIDA, but the column is nullable for ENTRADA docs — re-check here).
  const receptorRut = doc.receptorRut;
  const receptorRazonSocial = doc.receptorRazonSocial;
  if (!receptorRut || !receptorRazonSocial) {
    throw new EmitError("El documento no tiene receptor definido", 422);
  }

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new EmitError("Tenant no encontrado", 404);
  const missing = EMISOR_REQUIRED.filter((field) => !tenant[field]);
  if (missing.length > 0) {
    throw new EmitError(
      "Completa el perfil de emisor (RUT, razón social, giro, actividad, dirección y comuna) antes de emitir",
      422,
    );
  }
  // Narrowed by the check above.
  const emisorRut = tenant.rut!;
  const emisor = {
    rut: formatRutDv(emisorRut),
    razonSocial: tenant.razonSocial!,
    giro: tenant.giro!,
    actividadEconomica: tenant.actividadEconomica!,
    direccion: tenant.direccion!,
    comuna: tenant.comuna!,
  };

  const items = doc.items.map((i) => ({
    linea: i.linea,
    nombre: i.nombre,
    cantidad: Number(i.cantidad),
    precioUnitario: i.precioUnitario,
    descuento: i.descuento,
    afectoIva: i.afectoIva,
    total: lineTotal({
      cantidad: Number(i.cantidad),
      precioUnitario: i.precioUnitario,
      descuento: i.descuento,
    }),
  }));
  const totals = computeTotals(
    doc.tipoDte,
    items.map(({ cantidad, precioUnitario, descuento, afectoIva }) => ({
      cantidad,
      precioUnitario,
      descuento,
      afectoIva,
    })),
  );

  // ── Folio allocation ──
  let folio = doc.folio;
  let cafRow;
  if (folio == null) {
    const cafs = await db.caf.findMany({
      where: { tenantId, tipoDte: doc.tipoDte, active: true },
      orderBy: { folioDesde: "asc" },
    });
    cafRow = cafs.find((c) => c.nextFolio >= c.folioDesde && c.nextFolio <= c.folioHasta);
    if (!cafRow) {
      throw new EmitError(
        `No hay folios disponibles en el CAF para el tipo ${doc.tipoDte}. Sube un CAF nuevo.`,
        422,
      );
    }
    // Atomic claim: only succeeds if nobody else moved nextFolio meanwhile.
    const claimed = await db.caf.updateMany({
      where: { id: cafRow.id, active: true, nextFolio: cafRow.nextFolio },
      data: { nextFolio: { increment: 1 } },
    });
    if (claimed.count === 0) {
      throw new EmitError("Conflicto de folios: vuelve a intentar la emisión", 409);
    }
    folio = cafRow.nextFolio;
  } else {
    const cafs = await db.caf.findMany({
      where: { tenantId, tipoDte: doc.tipoDte, active: true },
    });
    cafRow = cafs.find((c) => folio! >= c.folioDesde && folio! <= c.folioHasta) ?? null;
    if (!cafRow) {
      throw new EmitError("El folio asignado no está cubierto por ningún CAF activo", 422);
    }
  }

  const caf = parseCaf(cafRow.xml);
  if (caf.tipoDte !== doc.tipoDte || caf.rutEmisor !== normalizeRut(emisorRut)) {
    throw new EmitError("El CAF no corresponde al emisor o al tipo de documento", 422);
  }

  // ── Persist folio + authoritative totals ──
  const totalsChanged =
    doc.neto !== totals.neto ||
    doc.mntExe !== totals.mntExe ||
    doc.iva !== totals.iva ||
    doc.total !== totals.total;
  if (doc.folio !== folio || totalsChanged) {
    await db.dteDocument.update({
      where: { id: doc.id },
      data: { folio, ...totals },
    });
  }

  const fecha = chileDate(doc.fechaEmision);
  const tmst = nowStamp();

  // ── TED (electronic stamp) ──
  const ted = buildTed({
    rutEmisor: emisor.rut,
    tipoDte: doc.tipoDte,
    folio,
    fecha,
    rutReceptor: formatRutDv(receptorRut),
    razonSocialReceptor: receptorRazonSocial,
    mntTotal: totals.total,
    primerItem: items[0]?.nombre ?? "",
    tstEd: tmst,
    cafXml: caf.cafXml,
    rsaskPem: caf.rsaskPem,
  });

  const xml = buildDteXml({
    tipoDte: doc.tipoDte,
    folio,
    fechaEmision: fecha,
    emisor,
    receptor: {
      rut: formatRutDv(receptorRut),
      razonSocial: receptorRazonSocial,
      giro: doc.receptorGiro ?? undefined,
      direccion: doc.receptorDireccion ?? undefined,
      comuna: doc.receptorComuna ?? undefined,
      email: doc.receptorEmail ?? undefined,
    },
    totales: totals,
    items: items.map((i) => ({
      ...i,
      monto: Math.round(i.cantidad * i.precioUnitario),
    })),
    references: doc.references.map((r) => ({
      tipoDteRef: r.tipoDteRef,
      folioRef: r.folioRef,
      fechaRef: r.fechaRef ? chileDate(r.fechaRef) : undefined,
      codigoRef: r.codigoRef ?? undefined,
      motivo: r.motivo ?? undefined,
    })),
    tipoTraslado: doc.tipoTraslado ?? undefined,
    ted,
    tmstFirma: tmst,
  });

  // ── 1) Sign ──
  let signed: string;
  try {
    signed = await createDteSigner().firmar(xml);
  } catch (err) {
    console.error("[emitir:firma] error", err);
    throw new EmitError("No se pudo firmar el documento", 500);
  }
  if (doc.estado === "BORRADOR") assertTransition("BORRADOR", "FIRMADO");
  await db.dteDocument.update({
    where: { id: doc.id },
    data: { estado: "FIRMADO", xml: signed },
  });

  // ── 2) Upload ──
  const envio = buildEnvioDte({
    rutEmisor: emisor.rut,
    rutEnvia: emisor.rut,
    fechaResolucion: tenant.resolucionFecha
      ? chileDate(tenant.resolucionFecha)
      : fecha,
    numeroResolucion: tenant.resolucionNumero ?? 0,
    fchFirma: tmst,
    documentos: [signed],
  });

  let trackId: string;
  try {
    ({ trackId } = await createSiiClient().enviar(envio));
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[emitir:envio] error", err);
    await db.dteDocument.update({
      where: { id: doc.id },
      data: { siiResponse: `Error de envío: ${detail}` },
    });
    throw new EmitError(`El SII no aceptó el envío: ${detail}`, 502);
  }

  assertTransition("FIRMADO", "ENVIADO");
  await db.dteDocument.update({
    where: { id: doc.id },
    data: { estado: "ENVIADO", trackId, siiResponse: null },
  });

  // ── 3) Query final state ──
  let estadoFinal: "ACEPTADO" | "RECHAZADO" | null = null;
  let glosa: string | undefined;
  try {
    const estado = await createSiiClient().consultarEstado(trackId);
    glosa = estado.glosa;
    if (estado.estado === "ACEPTADO") {
      assertTransition("ENVIADO", "ACEPTADO");
      estadoFinal = "ACEPTADO";
    } else if (estado.estado === "RECHAZADO") {
      assertTransition("ENVIADO", "RECHAZADO");
      estadoFinal = "RECHAZADO";
    }
  } catch (err) {
    // Non-fatal: the document stays ENVIADO and can be polled later.
    console.error("[emitir:estado] error", err);
  }

  if (estadoFinal) {
    await db.dteDocument.update({
      where: { id: doc.id },
      data: { estado: estadoFinal, siiResponse: glosa ?? null },
    });
  }

  return { estado: estadoFinal ?? "ENVIADO", folio, trackId };
}

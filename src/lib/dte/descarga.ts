/**
 * Descarga del registro de compras/ventas + XML/PDF por documento
 * (la función central de /descargas).
 *
 * Dos adaptadores tras la misma fachada:
 *
 *  - **real** — con credenciales del portal SII guardadas: login al
 *    portal + facade RCV (`rcv.ts`); el registro es el del SII.
 *  - **mock** — sin credenciales: el registro se compone con los
 *    documentos aceptados/anulados del tenant en Yellow.
 *
 * El XML se resuelve SIEMPRE contra la BD local (ahí están las ventas
 * firmadas): las filas sin XML local quedan con un motivo honesto —
 * el de terceros sólo lo sirve el portal del SII (Consulta de
 * documentos) y el de ventas externas nunca pasó por Yellow. El PDF se
 * genera localmente desde ese XML (`pdf.ts`), igual que todos los
 * proveedores: el SII no ofrece un servicio de PDF.
 */

import { decryptSecret, DecryptError } from "@/lib/crypto";
import { db } from "@/lib/db";
import { siiAmbiente } from "@/lib/sii/client";
import { crearSesionPortal, PortalError } from "@/lib/sii/portal";
import { descargarCsv, descargarRegistro, type FilaRegistro } from "@/lib/sii/rcv";
import { chileDate } from "./emit";
import { periodoBounds } from "./libro-periodo";

export type SentidoDescarga = "SALIDA" | "ENTRADA";
export type ModoDescarga = "mock" | "real";

export const MOTIVO_XML_TERCEROS =
  "El XML de proveedores se sirve desde el portal del SII (Consulta de documentos); Yellow no lo almacena.";
export const MOTIVO_XML_EXTERNO =
  "El documento consta en el SII pero no está almacenado en Yellow; no tenemos su XML firmado.";

export interface DocumentoRegistro {
  tipoDte: number;
  folio: number;
  /** "YYYY-MM-DD" (hora de Chile). */
  fecha: string;
  /** Emisor en compras, receptor en ventas; con guion. */
  contraparteRut: string | null;
  contraparteRazonSocial: string | null;
  neto: number;
  exento: number;
  iva: number;
  total: number;
  /** Estado local cuando el documento vive en Yellow; null si no. */
  estado: string | null;
  /** true cuando el XML del periodo está en la BD y es descargable. */
  xmlLocal: boolean;
  motivoSinXml?: string;
}

export interface RegistroDescarga {
  modo: ModoDescarga;
  sentido: SentidoDescarga;
  periodo: string;
  documentos: DocumentoRegistro[];
  /** Aviso no fatal (p. ej. el portal respondió con un desafío). */
  aviso?: string;
}

/** Con credenciales de portal → real; sin ellas → mock. */
export function resolverModo(tieneCredencial: boolean): ModoDescarga {
  return tieneCredencial ? "real" : "mock";
}

/** Motivo estándar de "este XML no está en Yellow". */
export function motivoXml(sentido: SentidoDescarga): string {
  return sentido === "ENTRADA" ? MOTIVO_XML_TERCEROS : MOTIVO_XML_EXTERNO;
}

interface DocLocal {
  tipoDte: number;
  folio: number | null;
  fechaEmision: Date;
  receptorRut: string | null;
  receptorRazonSocial: string | null;
  emisorRut: string | null;
  emisorRazonSocial: string | null;
  neto: number;
  mntExe: number;
  iva: number;
  total: number;
  estado: string;
  xml: string | null;
}

const selectDoc = {
  tipoDte: true,
  folio: true,
  fechaEmision: true,
  receptorRut: true,
  receptorRazonSocial: true,
  emisorRut: true,
  emisorRazonSocial: true,
  neto: true,
  mntExe: true,
  iva: true,
  total: true,
  estado: true,
  xml: true,
} as const;

/** Fila local → DocumentoRegistro (contraparte según el sentido). */
export function aDocumentoRegistro(d: DocLocal, sentido: SentidoDescarga): DocumentoRegistro {
  const conXml = Boolean(d.xml);
  return {
    tipoDte: d.tipoDte,
    folio: d.folio ?? 0,
    fecha: chileDate(d.fechaEmision),
    contraparteRut: sentido === "SALIDA" ? d.receptorRut : d.emisorRut,
    contraparteRazonSocial:
      sentido === "SALIDA" ? d.receptorRazonSocial : d.emisorRazonSocial,
    neto: d.neto,
    exento: d.mntExe,
    iva: d.iva,
    total: d.total,
    estado: d.estado,
    xmlLocal: conXml,
    ...(conXml ? {} : { motivoSinXml: motivoXml(sentido) }),
  };
}

/**
 * Registro modo mock: sólo lo que el SII tendría del tenant
 * (ACEPTADO/ANULADO con folio), mismo criterio que el libro.
 */
export function documentosMock(docs: DocLocal[], sentido: SentidoDescarga): DocumentoRegistro[] {
  return docs
    .filter(
      (d) =>
        d.folio != null &&
        (d.estado === "ACEPTADO" || d.estado === "ANULADO"),
    )
    .map((d) => aDocumentoRegistro(d, sentido));
}

/**
 * Fusiona las filas del RCV (SII) con los XML locales: matched por
 * tipo+folio; las filas sin XML local quedan con su motivo.
 */
export function fusionarRcv(
  filas: FilaRegistro[],
  locales: DocLocal[],
  sentido: SentidoDescarga,
): DocumentoRegistro[] {
  const indice = new Map(
    locales.filter((l) => l.folio != null).map((l) => [`${l.tipoDte}:${l.folio}`, l]),
  );
  return filas
    .filter((f) => f.folio > 0 && f.tipoDte > 0)
    .map((f) => {
      const local = indice.get(`${f.tipoDte}:${f.folio}`);
      const conXml = Boolean(local?.xml);
      return {
        tipoDte: f.tipoDte,
        folio: f.folio,
        fecha: f.fecha,
        contraparteRut: f.contraparteRut,
        contraparteRazonSocial: f.contraparteRazonSocial,
        neto: f.neto,
        exento: f.exento,
        iva: f.iva,
        total: f.total,
        estado: local?.estado ?? null,
        xmlLocal: conXml,
        ...(conXml ? {} : { motivoSinXml: motivoXml(sentido) }),
      };
    });
}

/** Docs del periodo en la BD (cualquier estado — cubre lookup de XML). */
async function docsLocales(
  tenantId: string,
  sentido: SentidoDescarga,
  periodo: string,
): Promise<DocLocal[]> {
  const bounds = periodoBounds(periodo);
  if (!bounds) {
    throw new Error(`Periodo inválido: "${periodo}" (se espera AAAA-MM).`);
  }
  return db.dteDocument.findMany({
    where: {
      tenantId,
      sentido,
      folio: { not: null },
      fechaEmision: { gte: bounds.gte, lt: bounds.lt },
    },
    orderBy: [{ fechaEmision: "asc" }, { folio: "asc" }],
    select: selectDoc,
  });
}

/**
 * Registro del periodo con el adaptador que corresponda. Nunca lanza
 * por errores del portal: los devuelve en `aviso` con la lista vacía,
 * para que la página pueda explicar qué pasó.
 */
export async function registroDelPeriodo(
  tenantId: string,
  sentido: SentidoDescarga,
  periodo: string,
): Promise<RegistroDescarga> {
  // Valida el periodo ANTES de tocar la BD o el portal.
  if (!periodoBounds(periodo)) {
    throw new Error(`Periodo inválido: "${periodo}" (se espera AAAA-MM).`);
  }

  const credencial = await db.siiPortalCredential.findUnique({
    where: { tenantId },
  });
  const modo = resolverModo(Boolean(credencial));
  const locales = await docsLocales(tenantId, sentido, periodo);

  if (modo === "mock" || !credencial) {
    return { modo: "mock", sentido, periodo, documentos: documentosMock(locales, sentido) };
  }

  try {
    const sesion = await crearSesionPortal({
      rut: credencial.rut,
      clave: decryptSecret(credencial.claveEncrypted),
      ambiente: siiAmbiente(),
    });
    const filas = await descargarRegistro(sesion, {
      rut: credencial.rut,
      periodo,
      sentido: sentido === "SALIDA" ? "VENTA" : "COMPRA",
    });
    return { modo, sentido, periodo, documentos: fusionarRcv(filas, locales, sentido) };
  } catch (err) {
    if (err instanceof PortalError || err instanceof DecryptError) {
      const aviso =
        err instanceof DecryptError
          ? "La clave guardada del portal no se pudo abrir (¿cambió CERT_ENCRYPTION_KEY?). Vuelve a guardarla en Facturación."
          : err.message;
      return { modo, sentido, periodo, documentos: [], aviso };
    }
    throw err;
  }
}

/** XML local de un documento del periodo (null cuando no está). */
export async function xmlDelPeriodo(
  tenantId: string,
  sentido: SentidoDescarga,
  periodo: string,
  tipoDte: number,
  folio: number,
): Promise<string | null> {
  const bounds = periodoBounds(periodo);
  if (!bounds) {
    throw new Error(`Periodo inválido: "${periodo}" (se espera AAAA-MM).`);
  }
  const doc = await db.dteDocument.findFirst({
    where: {
      tenantId,
      sentido,
      tipoDte,
      folio,
      fechaEmision: { gte: bounds.gte, lt: bounds.lt },
    },
    select: { xml: true },
  });
  return doc?.xml ?? null;
}

/** CSV local (modo mock) con el mismo espíritu que la exportación del SII. */
export function csvRegistro(docs: DocumentoRegistro[]): string {
  const esc = (v: string | number): string => {
    const s = String(v);
    return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const encabezado = [
    "Tipo",
    "Folio",
    "Fecha",
    "RUT Contraparte",
    "Razon Social",
    "Monto Neto",
    "Monto Exento",
    "Monto IVA",
    "Monto Total",
    "Estado",
    "XML local",
  ].join(";");
  const filas = docs.map((d) =>
    [
      d.tipoDte,
      d.folio,
      d.fecha,
      d.contraparteRut ?? "",
      d.contraparteRazonSocial ?? "",
      d.neto,
      d.exento,
      d.iva,
      d.total,
      d.estado ?? "",
      d.xmlLocal ? "si" : "no",
    ]
      .map(esc)
      .join(";"),
  );
  return [encabezado, ...filas].join("\r\n") + "\r\n";
}

/**
 * CSV del periodo: en modo real devuelve la exportación MISMA del SII;
 * en mock, la tabla local. Los errores del portal se propagan (el botón
 * de descarga debe ver el fallo, no un archivo vacío).
 */
export async function csvDelPeriodo(
  tenantId: string,
  sentido: SentidoDescarga,
  periodo: string,
): Promise<string> {
  if (!periodoBounds(periodo)) {
    throw new Error(`Periodo inválido: "${periodo}" (se espera AAAA-MM).`);
  }
  const credencial = await db.siiPortalCredential.findUnique({
    where: { tenantId },
  });
  if (!credencial) {
    const locales = await docsLocales(tenantId, sentido, periodo);
    return csvRegistro(documentosMock(locales, sentido));
  }

  const sesion = await crearSesionPortal({
    rut: credencial.rut,
    clave: decryptSecret(credencial.claveEncrypted),
    ambiente: siiAmbiente(),
  });
  return descargarCsv(sesion, {
    rut: credencial.rut,
    periodo,
    sentido: sentido === "SALIDA" ? "VENTA" : "COMPRA",
  });
}

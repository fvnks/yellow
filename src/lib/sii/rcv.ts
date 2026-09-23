/**
 * Registro de Compras y Ventas (RCV) del SII: descarga del registro de
 * ventas y de compras de un periodo.
 *
 * Consume el facade JSON interno del portal (`facadeService`), cuyo
 * protocolo completo vive en `portal.ts`. El flujo replica al navegador:
 *
 *  1. `getResumen` descubre qué tipos de documento tienen datos
 *  2. `getDetalleVenta` / `getDetalleCompra` trae las filas de cada tipo
 *     (el portal exige los campos de recaptcha con su bypass literal)
 *  3. `*Export` devuelve el mismo detalle como CSV (separador `;`)
 *
 * Ambiente: producción = www4.sii.cl, certificación = www4c.sii.cl.
 */

import { envolver, partirRut, RUTA_FACADE, NS_FACADE, type ClientePortalHttp } from "./portal";

export type OperacionRcv = "VENTA" | "COMPRA";

/** Secciones contables del portal. Sólo REGISTRO viene usado. */
export type EstadoContab = "REGISTRO" | "PENDIENTE" | "NO_INCLUIR" | "RECLAMADO";

export const RUTAS_RCV = {
  getResumen: `${RUTA_FACADE}/getResumen`,
  getDetalleVenta: `${RUTA_FACADE}/getDetalleVenta`,
  getDetalleCompra: `${RUTA_FACADE}/getDetalleCompra`,
  getDetalleVentaExport: `${RUTA_FACADE}/getDetalleVentaExport`,
  getDetalleCompraExport: `${RUTA_FACADE}/getDetalleCompraExport`,
} as const;

/** Una fila del registro tal como la devuelve el SII. */
export interface FilaRegistro {
  tipoDte: number;
  folio: number;
  /** Fecha del documento "YYYY-MM-DD" (vacío si el SII no la trae). */
  fecha: string;
  /** Contraparte con guion: emisor en compras, receptor en ventas. */
  contraparteRut: string | null;
  contraparteRazonSocial: string | null;
  neto: number;
  exento: number;
  iva: number;
  total: number;
}

export interface ParamsRegistro {
  /** RUT del contribuyente dueño del registro. */
  rut: string;
  /** "AAAA-MM". */
  periodo: string;
  sentido: OperacionRcv;
  /** Filtra un tipo de documento concreto (codTipoDoc). */
  tipoDte?: number | string;
  estadoContab?: EstadoContab;
  /** Campos de recaptcha (detalle y export llevan el bypass literal). */
  recaptcha?: boolean;
  /** Marca la primera consulta del portal. */
  busquedaInicial?: boolean;
}

/**
 * Payload del facade. El portal manda `tokenRecaptcha` literal
 * "t-o-k-e-n-web" y `accionRecaptcha` identificando la operación
 * (RCV_DETC = compra, RCV_DETV = venta).
 */
export function datosRegistro(p: ParamsRegistro): Record<string, string | boolean> {
  const { cuerpo, dv } = partirRut(p.rut);
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(p.periodo);
  if (!m) throw new Error(`Periodo inválido: "${p.periodo}" (se espera AAAA-MM)`);
  const datos: Record<string, string | boolean> = {
    rutEmisor: cuerpo,
    dvEmisor: dv,
    ptributario: `${m[1]}${m[2]}`,
    operacion: p.sentido,
    estadoContab: p.estadoContab ?? "REGISTRO",
  };
  if (p.tipoDte != null) datos.codTipoDoc = String(p.tipoDte);
  if (p.busquedaInicial) datos.busquedaInicial = true;
  if (p.recaptcha) {
    datos.tokenRecaptcha = "t-o-k-e-n-web";
    datos.accionRecaptcha = p.sentido === "COMPRA" ? "RCV_DETC" : "RCV_DETV";
  }
  return datos;
}

function post(
  sesion: ClientePortalHttp,
  ruta: string,
  metodo: string,
  p: ParamsRegistro,
): Promise<unknown> {
  const body = envolver(
    sesion.token,
    `${NS_FACADE}/${metodo}`,
    datosRegistro(p),
  );
  return sesion.postJson(`${sesion.baseRcv}${ruta}`, body);
}

/** Tipos de documento con datos en el periodo (desde el resumen). */
export async function tiposConDatos(
  sesion: ClientePortalHttp,
  p: ParamsRegistro,
): Promise<number[]> {
  const resp = await post(sesion, RUTAS_RCV.getResumen, "getResumen", {
    ...p,
    busquedaInicial: true,
  });
  const filas = extraerData(resp);
  return filas
    .map((f) => Number((f as Record<string, unknown>).rsmnTipoDocInteger))
    .filter((t) => Number.isInteger(t) && t > 0);
}

/** Filas del detalle de un tipo de documento puntual. */
export async function detalleTipo(
  sesion: ClientePortalHttp,
  p: ParamsRegistro,
): Promise<FilaRegistro[]> {
  const metodo =
    p.sentido === "COMPRA" ? "getDetalleCompra" : "getDetalleVenta";
  const ruta =
    p.sentido === "COMPRA" ? RUTAS_RCV.getDetalleCompra : RUTAS_RCV.getDetalleVenta;
  const resp = await post(sesion, ruta, metodo, { ...p, recaptcha: true });
  return extraerData(resp).map(mapearFila);
}

/**
 * Registro completo del periodo: descubre tipos con `getResumen` y
 * concatena el detalle de cada uno.
 */
export async function descargarRegistro(
  sesion: ClientePortalHttp,
  p: ParamsRegistro,
): Promise<FilaRegistro[]> {
  const tipos = p.tipoDte != null ? [Number(p.tipoDte)] : await tiposConDatos(sesion, p);
  const out: FilaRegistro[] = [];
  for (const tipo of tipos) {
    out.push(...(await detalleTipo(sesion, { ...p, tipoDte: tipo })));
  }
  return out;
}

/** CSV del detalle, igual que el botón "Descargar Detalles" (separador `;`). */
export async function descargarCsv(
  sesion: ClientePortalHttp,
  p: ParamsRegistro,
): Promise<string> {
  const metodo =
    p.sentido === "COMPRA" ? "getDetalleCompraExport" : "getDetalleVentaExport";
  const ruta =
    p.sentido === "COMPRA"
      ? RUTAS_RCV.getDetalleCompraExport
      : RUTAS_RCV.getDetalleVentaExport;
  const body = envolver(
    sesion.token,
    `${NS_FACADE}/${metodo}`,
    datosRegistro({ ...p, recaptcha: true }),
  );
  return sesion.postTexto(`${sesion.baseRcv}${ruta}`, body);
}

function extraerData(resp: unknown): unknown[] {
  if (resp && typeof resp === "object" && "data" in resp) {
    const d = (resp as { data: unknown }).data;
    return Array.isArray(d) ? d : [];
  }
  return Array.isArray(resp) ? resp : [];
}

/** Fila cruda del SII → FilaRegistro. */
export function mapearFila(cruda: unknown): FilaRegistro {
  const f = (cruda ?? {}) as Record<string, unknown>;
  const rut = String(f.detRutDoc ?? "").trim();
  const dv = String(f.detDvDoc ?? "").trim();
  const numero = (v: unknown, fallback = 0): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    tipoDte: numero(f.detTipoDoc ?? f.detTpoDoc, 0),
    folio: numero(f.detNroDoc, 0),
    fecha: String(f.detFchDoc ?? ""),
    contraparteRut: rut ? (dv ? `${rut}-${dv}` : rut) : null,
    contraparteRazonSocial: String(f.detRznSoc ?? "").trim() || null,
    neto: numero(f.detMntNeto),
    exento: numero(f.detMntExe),
    iva: numero(f.detMntIVA ?? f.detMntIva),
    total: numero(f.detMntTotal),
  };
}

/**
 * Sesión del portal del SII para los servicios internos del RCV
 * (Registro de Compras y Ventas) — la única vía programática conocida
 * para descargar el registro de compras y ventas: el SII no publica
 * API oficial para esto y todos los proveedores usan este flujo.
 *
 * Protocolo mapeado desde el portal oficial (Angular en www4):
 *
 *  1. Login RUT + clave en zeusr.sii.cl (IngresoRutClave.html) → cookies
 *  2. GET  el SPA del RCV                        (contexto de cookies)
 *  3. POST autConfDataService/obtieneConf  +  GET aaSessionService/load
 *     (en paralelo; aaSession carga identidad rut/dv del usuario)
 *  4. GET  zeusr cgi_AUT2000/AutTknData.cgi (JSONP) — paso que materializa
 *     la sesión del backend JBoss
 *  5. POST settingsService/consultarParametros   (envelope metaData)
 *  6. POST facadeService/getDatosInicio          (estado inicial del RCV)
 *
 * Todas las llamadas al facade van envueltas en
 * `{ metaData: { namespace, conversationId: TOKEN, transactionId }, data }`
 * donde `conversationId` es la cookie TOKEN entregada en el login.
 *
 * Límite conocido: el SII puede interponer una sala de espera Queue-it
 * o un desafío JavaScript que un POST plano no supera — en ese caso se
 * lanza PortalError con código "desafio" (nunca un silencio).
 */

import { randomUUID } from "node:crypto";
import { formatRutDv, normalizeRut } from "@/lib/rut";
import type { SiiAmbiente } from "./client";

export type CodigoPortal = "desafio" | "credenciales" | "sesion" | "red";

export class PortalError extends Error {
  constructor(
    message: string,
    readonly codigo: CodigoPortal,
  ) {
    super(message);
    this.name = "PortalError";
  }
}

/** Subdominio del portal RCV por ambiente (www4c = certificación). */
export const HOSTS_RCV: Record<SiiAmbiente, string> = {
  certificacion: "www4c.sii.cl",
  produccion: "www4.sii.cl",
};

/** Autenticador único para ambos ambientes. */
const AUTH_URL = "https://zeusr.sii.cl";

/** URL de retorno post-login (la referencia va como query string crudo). */
export function urlReferencia(ambiente: SiiAmbiente): string {
  return ambiente === "produccion"
    ? "https://misii.sii.cl/cgi_misii/siihome.cgi"
    : "https://misiir.sii.cl/cgi_misii/siihome.cgi";
}

/** Base path del facade JSON del RCV. */
export const RUTA_FACADE = "/consdcvinternetui/services/data/facadeService";

/** Namespace Java del servicio (identifica la clase remota). */
export const NS_FACADE =
  "cl.sii.sdi.lob.diii.consdcv.data.api.interfaces.FacadeService";

// ── Cookies (jar mínimo: sólo nombre=valor) ────────────────────────

export class Galletas {
  private mapa = new Map<string, string>();

  /** Cabecera Cookie para la siguiente petición. */
  cabecera(): string {
    return [...this.mapa.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  /** Absorbe todos los Set-Cookie de una respuesta (attrs ignorados). */
  absorber(res: Response): void {
    const crudas =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : res.headers.has("set-cookie")
          ? [res.headers.get("set-cookie")!]
          : [];
    for (const c of crudas) {
      const par = c.split(";")[0];
      const i = par.indexOf("=");
      if (i > 0) this.mapa.set(par.slice(0, i).trim(), par.slice(i + 1).trim());
    }
  }

  get(name: string): string | null {
    return this.mapa.get(name) ?? null;
  }
}

// ── Envelope del facade ────────────────────────────────────────────

export interface EnvelopeMeta {
  namespace: string;
  conversationId: string;
  transactionId: string;
}

export function envolver(
  token: string,
  namespace: string,
  data: Record<string, unknown>,
): { metaData: EnvelopeMeta; data: Record<string, unknown> } {
  return {
    metaData: { namespace, conversationId: token, transactionId: randomUUID() },
    data,
  };
}

/** RUT a cuerpo + DV ("76543210-3" → { cuerpo: "76543210", dv: "3" }). */
export function partirRut(rut: string): { cuerpo: string; dv: string } {
  const digitos = normalizeRut(rut);
  if (digitos.length < 2) {
    throw new PortalError(`RUT inválido: "${rut}"`, "sesion");
  }
  return { cuerpo: digitos.slice(0, -1), dv: digitos.slice(-1).toUpperCase() };
}

/** RUT del emisor ya con guion, para formularios del portal. */
export function rutFormateado(rut: string): string {
  return formatRutDv(normalizeRut(rut));
}

// ── Cliente HTTP de la sesión ──────────────────────────────────────

/**
 * Puerto que consume `rcv.ts`: JSON y texto con las cookies de la
 * sesión. Permite probar el cliente RCV con un stub de `postJson`.
 */
export interface ClientePortalHttp {
  readonly ambiente: SiiAmbiente;
  readonly baseRcv: string;
  readonly token: string;
  postJson(url: string, body: unknown): Promise<unknown>;
  postTexto(url: string, body: unknown): Promise<string>;
}

export interface SesionPortal extends ClientePortalHttp {
  /** Identidad que reportó aaSessionService (puede venir vacía). */
  readonly rutUsuario: string;
  readonly dvUsuario: string;
  readonly jar: Galletas;
}

export interface CredencialesPortal {
  /** RUT del contribuyente (cualquier formato). */
  rut: string;
  /** Clave tributaria. */
  clave: string;
  ambiente: SiiAmbiente;
}

export interface OpcionesSesion {
  /** Inyectable para tests; por defecto el fetch global. */
  fetcher?: typeof fetch;
}

function htmlDeDesafio(html: string): boolean {
  const h = html.toLowerCase();
  return (
    h.includes("queue-it") ||
    h.includes("queueit") ||
    h.includes("just a moment") ||
    h.includes("cf-browser-verification") ||
    h.includes("captcha")
  );
}

/**
 * Login RUT + clave contra zeusr y bootstrap de la sesión del RCV.
 * Lanza PortalError con el código correspondiente cuando el SII
 * responde con desafío, credenciales rechazadas o una sesión caída.
 */
export async function crearSesionPortal(
  cred: CredencialesPortal,
  opciones: OpcionesSesion = {},
): Promise<SesionPortal> {
  const fetcher = opciones.fetcher ?? fetch;
  const jar = new Galletas();
  const referencia = urlReferencia(cred.ambiente);
  const urlLogin =
    `${AUTH_URL}/AUT2000/InicioAutenticacion/IngresoRutClave.html?${referencia}`;

  const pedir = async (
    url: string,
    init: RequestInit,
    esperado: number[] = [200, 302],
  ): Promise<Response> => {
    let res: Response;
    try {
      res = await fetcher(url, init);
    } catch (err) {
      throw new PortalError(
        `Sin conexión con el SII: ${err instanceof Error ? err.message : String(err)}`,
        "red",
      );
    }
    jar.absorber(res);
    if (!esperado.includes(res.status)) {
      throw new PortalError(
        `El SII respondió HTTP ${res.status} en ${new URL(url).pathname}`,
        "sesion",
      );
    }
    return res;
  };

  // ── 1) Página de login (cookies iniciales) ──
  await pedir(urlLogin, { headers: { Accept: "text/html" } });

  // ── 2) Credenciales ──
  const cuerpo = new URLSearchParams({
    rutcntr: rutFormateado(cred.rut),
    clave: cred.clave,
    bt_ingresar: "Ingresar",
  }).toString();
  const resLogin = await pedir(
    urlLogin,
    {
      method: "POST",
      headers: {
        Accept: "text/html",
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: jar.cabecera(),
        Referer: urlLogin,
      },
      body: cuerpo,
    },
    [200, 302],
  );
  const html = await resLogin.text().catch(() => "");
  if (htmlDeDesafio(html)) {
    throw new PortalError(
      "El SII interpuso una sala de espera o desafío de navegador; inténtalo fuera de horario de cola o usa el portal manual.",
      "desafio",
    );
  }
  const quedoEnLogin =
    resLogin.url.includes("IngresoRutClave") ||
    html.includes('id="clave"') ||
    html.includes('name="clave"');
  if (quedoEnLogin) {
    throw new PortalError(
      "El SII rechazó las credenciales del portal (RUT o clave tributaria)",
      "credenciales",
    );
  }

  // ── 3) Bootstrap de la sesión del RCV ──
  const host = HOSTS_RCV[cred.ambiente];
  const base = `https://${host}`;
  const refererRcv = `${base}/consdcvinternetui/`;
  const encJson = (): Record<string, string> => ({
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json;charset=UTF-8",
    Referer: refererRcv,
    Cookie: jar.cabecera(),
  });
  const texto = async (url: string, init: RequestInit): Promise<string> =>
    (await pedir(url, init)).text();
  const json = async (url: string, init: RequestInit): Promise<unknown> => {
    const t = await texto(url, init);
    try {
      return JSON.parse(t) as unknown;
    } catch {
      return null;
    }
  };
  const token = jar.get("TOKEN") ?? "";

  // 3a. SPA del RCV (contexto de cookies).
  await texto(`${base}/consdcvinternetui/`, {
    headers: { Accept: "text/html", Cookie: jar.cabecera() },
  });

  // 3b. obtieneConf + aaSessionService en paralelo (como el navegador).
  const ts = Date.now();
  const [, respSesion] = await Promise.all([
    json(`${base}/common-1.0/services/autConfDataService/obtieneConf`, {
      method: "POST",
      headers: encJson(),
      body: "{}",
    }),
    json(`${base}/common-1.0/services/aaSessionService/load`, {
      headers: { ...encJson(), Accept: "application/json, text/plain, */*" },
    }),
  ]);

  // 3c. JSONP de validación del token (materializa la sesión JBoss).
  await pedir(
    `${AUTH_URL}/cgi_AUT2000/AutTknData.cgi?rnd=${Math.random()}` +
      `&callback=jQuery_${ts}&_=${ts + 1}`,
    {
      headers: {
        Accept: "*/*",
        Cookie: jar.cabecera(),
        Referer: refererRcv,
      },
    },
  );

  // 3d. Parámetros de la aplicación + estado inicial del RCV.
  await json(`${base}/consdcvinternetui/services/data/settingsService/consultarParametros`, {
    method: "POST",
    headers: encJson(),
    body: JSON.stringify(envolver(token, `${NS_FACADE}/consultarParametros`, {})),
  });
  await json(`${base}${RUTA_FACADE}/getDatosInicio`, {
    method: "POST",
    headers: encJson(),
    body: JSON.stringify(envolver(token, `${NS_FACADE}/getDatosInicio`, {})),
  });

  const datosSesion =
    respSesion && typeof respSesion === "object" && "data" in respSesion
      ? (respSesion as { data: unknown }).data
      : respSesion;
  const ident =
    datosSesion && typeof datosSesion === "object" && "data" in datosSesion
      ? (datosSesion as { data: unknown }).data
      : datosSesion;
  const rutUsuario = String(
    (ident as { rut?: unknown } | null)?.rut ?? "",
  );
  const dvUsuario = String((ident as { dv?: unknown } | null)?.dv ?? "");

  const encabezadosTexto = (): Record<string, string> => ({
    ...encJson(),
    Accept: "text/csv, application/octet-stream, text/plain, */*",
  });

  const postJson = async (url: string, body: unknown): Promise<unknown> => {
    const t = await texto(url, {
      method: "POST",
      headers: encJson(),
      body: JSON.stringify(body),
    });
    try {
      return JSON.parse(t) as unknown;
    } catch {
      return null;
    }
  };
  const postTexto = async (url: string, body: unknown): Promise<string> =>
    texto(url, {
      method: "POST",
      headers: encabezadosTexto(),
      body: JSON.stringify(body),
    });

  return {
    ambiente: cred.ambiente,
    baseRcv: base,
    token,
    rutUsuario,
    dvUsuario,
    jar,
    postJson,
    postTexto,
  };
}

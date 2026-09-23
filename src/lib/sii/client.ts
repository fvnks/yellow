/**
 * Real SII client for DTE (facturas et al.) — the classic seed/token +
 * multipart upload flow, hand-rolled over plain HTTP:
 *
 *  1. `CrSeed.jws` (SOAP)         → seed XML
 *  2. sign it (`DteSigner.firmarSemilla`) → `GetTokenFromSeed.jws` → token
 *     (cached in-process; valid ~1 h, we renew at 50 min)
 *  3. `POST /cgi_dte/UPL/DTEUpload` multipart with `Cookie: TOKEN=…`
 *     → TrackID
 *  4. `QueryEstUp.jws` (SOAP)     → estado del sobre
 *
 * Endpoints per ambiente: certificación = maullin.sii.cl,
 * producción = palena.sii.cl. The SOAP services are RPC/encoded with
 * `targetNamespace=http://DefaultNamespace`, so envelopes are built by
 * hand (no SOAP library needed).
 */

import { randomUUID } from "node:crypto";
import https from "node:https";
import { esc } from "@/lib/dte/xml";
import { normalizeRut } from "@/lib/rut";
import { findTag, unescapeXmlText } from "@/lib/xmlutil";
import type { CertificateMaterial } from "./pkcs12";
import type { EstadoEnvio, SiiClient } from "./types";

export type SiiAmbiente = "certificacion" | "produccion";

const HOSTS: Record<SiiAmbiente, string> = {
  certificacion: "maullin.sii.cl",
  produccion: "palena.sii.cl",
};

/** SII_ENV=produccion switches to palena; anything else is certificación. */
export function siiAmbiente(): SiiAmbiente {
  return process.env.SII_ENV === "produccion" ? "produccion" : "certificacion";
}

export class SiiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiiClientError";
  }
}

const HTTP_TIMEOUT_MS = 30_000;
const TOKEN_TTL_MS = 50 * 60_000;

/** Process-wide token cache, keyed by tenant+certificate+ambiente. */
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

// Estado codes from QueryEstUp (RESP_HDR/ESTADO): SOK = schema ok,
// RPR = accepted with remarks, RSC/RCH/RFR = rejected, EPR = still
// processing anything else stays PENDIENTE with the SII's glosa.
const ESTADOS_ACEPTADO = new Set(["SOK", "RPR"]);
const ESTADOS_RECHAZADO = new Set(["RSC", "RCH", "RFR"]);

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const SOAP_OPEN =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ` +
  `xmlns:xsd="http://www.w3.org/2001/XMLSchema" ` +
  `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
  `xmlns:intf="http://DefaultNamespace">\n<soapenv:Body>\n`;
const SOAP_CLOSE = `\n</soapenv:Body>\n</soapenv:Envelope>`;

async function soapCall(url: string, bodyXml: string, fetchImpl: FetchLike): Promise<string> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: "" },
      body: SOAP_OPEN + bodyXml + SOAP_CLOSE,
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
  } catch (err) {
    throw new SiiClientError(
      `Sin respuesta del SII (${url.split("/").pop()}): ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const text = await res.text();
  if (!res.ok) throw new SiiClientError(`El SII respondió HTTP ${res.status} en ${url}`);
  return text;
}

/** Unwrap a SOAP RPC return part (escaped XML inside the response). */
function extractSoapReturn(response: string, name: string): string {
  const value = findTag(response, name);
  if (value === null) throw new SiiClientError(`Respuesta SOAP sin <${name}>`);
  return unescapeXmlText(value);
}

export type SeedSigner = (seedResponseXml: string) => Promise<string> | string;

export async function getSiiToken(
  ambiente: SiiAmbiente,
  cacheKey: string,
  signSeed: SeedSigner,
  fetchImpl: FetchLike,
): Promise<string> {
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const base = `https://${HOSTS[ambiente]}/DTEWS`;
  const seedResponse = extractSoapReturn(
    await soapCall(`${base}/CrSeed.jws`, `<intf:getSeed/>`, fetchImpl),
    "getSeedReturn",
  );
  const signedSeed = await signSeed(seedResponse);
  const tokenResponse = extractSoapReturn(
    await soapCall(
      `${base}/GetTokenFromSeed.jws`,
      `<intf:getToken><pszXml xsi:type="xsd:string">${esc(signedSeed)}</pszXml></intf:getToken>`,
      fetchImpl,
    ),
    "getTokenReturn",
  );
  const token = findTag(tokenResponse, "TOKEN")?.trim();
  if (!token) {
    const estado = findTag(tokenResponse, "ESTADO")?.trim();
    const glosa = findTag(tokenResponse, "GLOSA")?.trim();
    throw new SiiClientError(
      `El SII rechazó la semilla firmada (${estado ?? "sin estado"})` +
        `${glosa ? `: ${glosa}` : ""} — ¿el certificado pertenece al RUT del emisor?`,
    );
  }
  tokenCache.set(cacheKey, { token, expiresAt: Date.now() + TOKEN_TTL_MS });
  return token;
}

/** Test hook: drop cached tokens (and optionally assert cache behavior). */
export function clearSiiTokenCache(): void {
  tokenCache.clear();
}

function assertLatin1(value: string, what: string): void {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 0xff) {
      throw new SiiClientError(`${what} contiene caracteres fuera de ISO-8859-1: "${value[i]}"`);
    }
  }
}

function summarize(text: string): string {
  const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return (plain || text).slice(0, 300);
}

/**
 * Minimal mTLS request against the cert-authenticated portal (anulación
 * de folios). node:https carries the .p12 material; the response is read
 * as ISO-8859-1, the SII's legacy encoding.
 */
function mtlsCall(
  url: string,
  material: CertificateMaterial,
  opts: { method: "GET" | "POST"; body?: string },
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = https.request(
      {
        hostname: target.hostname,
        port: target.port || 443,
        path: target.pathname + target.search,
        method: opts.method,
        key: material.privateKeyPem,
        cert: material.certificatePem,
        rejectUnauthorized: true,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; YellowSii/1.0)",
          Accept: "text/html,application/xhtml+xml,*/*",
          ...(opts.body
            ? {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(opts.body),
              }
            : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("latin1"),
          }),
        );
      },
    );
    req.setTimeout(HTTP_TIMEOUT_MS, () => req.destroy(new Error("timeout tras 30 s")));
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

export interface RealSiiClientOptions {
  ambiente: SiiAmbiente;
  /** Tenant emisor RUT (normalized "765432103" or hyphenated — both accepted). */
  rut: string;
  /** Token cache identity (tenant + certificate + ambiente). */
  cacheKey: string;
  signSeed: SeedSigner;
  fetchImpl?: FetchLike;
  /** .p12 material for portal calls that require client-certificate TLS. */
  certificate?: CertificateMaterial;
}

export class RealSiiClient implements SiiClient {
  private readonly rutBody: string;
  private readonly rutDv: string;
  private readonly fetchImpl: FetchLike;

  constructor(private readonly opts: RealSiiClientOptions) {
    const normalized = normalizeRut(opts.rut);
    this.rutBody = normalized.slice(0, -1);
    this.rutDv = normalized.slice(-1);
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private get base(): string {
    return `https://${HOSTS[this.opts.ambiente]}`;
  }

  private token(): Promise<string> {
    return getSiiToken(this.opts.ambiente, this.opts.cacheKey, this.opts.signSeed, this.fetchImpl);
  }

  async enviar(envioXml: string): Promise<{ trackId: string }> {
    assertLatin1(envioXml, "El sobre <EnvioDTE>");
    const token = await this.token();

    const boundary = `----YellowSii${randomUUID().replace(/-/g, "")}`;
    const part = (name: string, value: string) =>
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
    const head =
      part("rutSender", this.rutBody) +
      part("dvSender", this.rutDv) +
      part("rutCompany", this.rutBody) +
      part("dvCompany", this.rutDv) +
      `--${boundary}\r\nContent-Disposition: form-data; name="archivo"; filename="envio.xml"\r\n` +
      `Content-Type: text/xml; charset=ISO-8859-1\r\n\r\n`;
    const tail = `\r\n--${boundary}--\r\n`;
    const body = Buffer.concat([
      Buffer.from(head, "ascii"),
      Buffer.from(envioXml, "latin1"),
      Buffer.from(tail, "ascii"),
    ]);

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.base}/cgi_dte/UPL/DTEUpload`, {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          Cookie: `TOKEN=${token}`,
          Accept: "image/gif, image/x-xbitmap, image/jpeg, image/pjpeg, */*",
          "Accept-Language": "es-cl",
          "User-Agent": "Mozilla/4.0 (compatible; PROG 1.0; Windows NT 5.0; YComp 5.0.2.4)",
        },
        body,
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
    } catch (err) {
      throw new SiiClientError(
        `Sin respuesta del SII al subir el envío: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const text = await res.text();
    if (!res.ok) {
      throw new SiiClientError(`El SII rechazó la subida (HTTP ${res.status}): ${summarize(text)}`);
    }
    const trackId = findTag(text, "TRACKID")?.trim();
    if (!trackId) {
      throw new SiiClientError(`El SII no devolvió TrackID: ${summarize(text)}`);
    }
    return { trackId };
  }

  async consultarEstado(trackId: string): Promise<{ estado: EstadoEnvio; glosa?: string }> {
    if (!/^\d+$/.test(trackId)) {
      throw new SiiClientError(`TrackID inválido: ${trackId}`);
    }
    const token = await this.token();
    const response = extractSoapReturn(
      await soapCall(
        `${this.base}/DTEWS/QueryEstUp.jws`,
        `<intf:getEstUp>` +
          `<RutCompania xsi:type="xsd:string">${this.rutBody}</RutCompania>` +
          `<DvCompania xsi:type="xsd:string">${this.rutDv}</DvCompania>` +
          `<TrackId xsi:type="xsd:string">${trackId}</TrackId>` +
          `<Token xsi:type="xsd:string">${esc(token)}</Token>` +
          `</intf:getEstUp>`,
        this.fetchImpl,
      ),
      "getEstUpReturn",
    );

    const codigo = findTag(response, "ESTADO")?.trim() ?? "";
    const glosa = findTag(response, "GLOSA")?.trim() || undefined;
    if (ESTADOS_ACEPTADO.has(codigo)) return { estado: "ACEPTADO", glosa };
    if (ESTADOS_RECHAZADO.has(codigo)) return { estado: "RECHAZADO", glosa };
    return {
      estado: "PENDIENTE",
      glosa: glosa ?? (codigo ? `Código SII ${codigo}` : undefined),
    };
  }

  /**
   * Anulación de folios aún no recepcionados (FAQ SII 001.003.2167.006,
   * caso "previo al envío"): el portal `cvc_cgi/dte/af_anular3` exige
   * sesión con certificado digital (mTLS) y sólo acepta folios que el SII
   * no ha recibido. Al ser una interfaz de formulario, cualquier cambio
   * del SII se refleja en la glosa devuelta para ajustarla con un .p12
   * real a la mano.
   */
  async anularFolio(
    input: { tipoDte: number; folio: number },
  ): Promise<{ ok: boolean; glosa?: string }> {
    const { tipoDte, folio } = input;
    if (!Number.isInteger(folio) || folio < 1) {
      throw new SiiClientError(`Folio inválido: ${folio}`);
    }
    const material = this.opts.certificate;
    if (!material) {
      throw new SiiClientError(
        "Falta el certificado digital (.p12) para anular folios en el SII",
      );
    }

    const form = new URLSearchParams({
      tipo: String(tipoDte),
      desde: String(folio),
      hasta: String(folio),
      rut: this.rutBody,
      dv: this.rutDv,
    }).toString();

    const res = await mtlsCall(`${this.base}/cvc_cgi/dte/af_anular3`, material, {
      method: "POST",
      body: form,
    }).catch((err: unknown) => {
      throw new SiiClientError(
        `Sin respuesta del portal del SII (anulación de folio): ${err instanceof Error ? err.message : String(err)}`,
      );
    });
    if (res.status < 200 || res.status >= 300) {
      throw new SiiClientError(
        `El portal del SII respondió HTTP ${res.status}: ${summarize(res.body)}`,
      );
    }
    if (/no se encuentra autenticado/i.test(res.body)) {
      throw new SiiClientError(
        "El SII no aceptó la sesión con certificado digital (anulación de folios)",
      );
    }
    if (/folio[s]? anulad/i.test(res.body) || /anulaci[oó]n (realizada|efectuada)/i.test(res.body)) {
      return { ok: true, glosa: summarize(res.body) };
    }
    if (/recepcionad/i.test(res.body)) {
      return {
        ok: false,
        glosa: "El folio ya fue recepcionado por el SII: anúlalo con una nota de crédito/débito.",
      };
    }
    return { ok: false, glosa: summarize(res.body) || `Respuesta sin reconocer (HTTP ${res.status})` };
  }
}

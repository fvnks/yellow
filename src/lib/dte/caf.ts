/**
 * CAF (Código de Autorización de Folios) parser.
 *
 * Structure per SII "Instructivo Técnico" A.1.2:
 *
 *   <AUTORIZACION>
 *     <CAF version="1.0">
 *       <DA> <RE> <RS> <TD> <RNG><D/><H/></RNG> <FA> <RSAPK/> <IDK/> </DA>
 *       <FRMA algoritmo="SHA1withRSA"/>
 *     </CAF>
 *     <RSASK> PEM private key </RSASK>
 *     <RSAPUBK>…</RSAPUBK>
 *   </AUTORIZACION>
 *
 * RSASK signs the TED (electronic stamp), so the file is sensitive.
 * Parsing is intentionally dependency-free: the CAF is a flat document
 * with fixed tags, and no XML entity decoding is needed for the fields
 * we read (RUT, numbers, dates, base64 blobs).
 */

import { createPrivateKey } from "node:crypto";
import { isValidRut, normalizeRut } from "@/lib/rut";

export class CafParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CafParseError";
  }
}

export interface ParsedCaf {
  /** Normalized emisor RUT ("762379115"). */
  rutEmisor: string;
  razonSocial: string;
  tipoDte: number;
  folioDesde: number;
  folioHasta: number;
  /** Authorization date "YYYY-MM-DD". */
  fechaAutorizacion: string;
  /** The exact `<CAF version="…">…</CAF>` block, to embed in the TED unmodified. */
  cafXml: string;
  /** RSASK as PEM (headers added when the file ships raw base64). */
  rsaskPem: string;
}

function tag(xml: string, name: string): string | null {
  const match = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return match ? match[1].trim() : null;
}

function requireTag(xml: string, name: string, cafXml: boolean): string {
  const value = tag(xml, name);
  if (value == null) {
    throw new CafParseError(
      cafXml ? `CAF inválido: falta <${name}>` : `Autorización inválida: falta <${name}>`,
    );
  }
  return value;
}

/** Wrap raw base64 in PKCS#1 PEM headers when the file omits them. */
function toPem(raw: string): string {
  const cleaned = raw.replace(/\r/g, "").trim();
  if (cleaned.includes("BEGIN")) return cleaned;
  const base64 = cleaned.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(base64) || base64.length === 0) {
    throw new CafParseError("CAF inválido: RSASK no es PEM ni base64 válido");
  }
  const lines = base64.match(/.{1,64}/g)?.join("\n") ?? base64;
  return `-----BEGIN RSA PRIVATE KEY-----\n${lines}\n-----END RSA PRIVATE KEY-----`;
}

export function parseCaf(xml: string): ParsedCaf {
  if (!xml.includes("<AUTORIZACION") && !xml.includes("<CAF")) {
    throw new CafParseError("No parece ser un CAF (falta <AUTORIZACION>/<CAF>)");
  }

  const cafBlock = xml.match(/<CAF[^>]*>[\s\S]*?<\/CAF>/)?.[0];
  if (!cafBlock) throw new CafParseError("CAF inválido: falta el bloque <CAF>");

  const rutRaw = requireTag(cafBlock, "RE", true);
  if (!isValidRut(rutRaw)) {
    throw new CafParseError(`CAF inválido: RUT emisor inválido (${rutRaw})`);
  }

  const razonSocial = requireTag(cafBlock, "RS", true);
  const tipoRaw = requireTag(cafBlock, "TD", true);
  if (!/^\d{2,3}$/.test(tipoRaw)) {
    throw new CafParseError(`CAF inválido: tipo de DTE inválido (${tipoRaw})`);
  }

  const rng = cafBlock.match(/<RNG>([\s\S]*?)<\/RNG>/)?.[1];
  const desde = rng ? tag(`<X>${rng}</X>`, "D") : null;
  const hasta = rng ? tag(`<X>${rng}</X>`, "H") : null;
  if (!desde || !hasta) throw new CafParseError("CAF inválido: falta <RNG><D>/<H>");
  const folioDesde = Number(desde);
  const folioHasta = Number(hasta);
  if (!Number.isInteger(folioDesde) || !Number.isInteger(folioHasta) || folioDesde > folioHasta) {
    throw new CafParseError("CAF inválido: rango de folios inválido");
  }

  const fechaAutorizacion = requireTag(cafBlock, "FA", true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaAutorizacion)) {
    throw new CafParseError(`CAF inválido: fecha de autorización inválida (${fechaAutorizacion})`);
  }

  const rsaskRaw = requireTag(xml, "RSASK", false);
  const rsaskPem = toPem(rsaskRaw);
  try {
    createPrivateKey(rsaskPem); // validates the key before we ever store it
  } catch {
    throw new CafParseError("CAF inválido: RSASK no es una clave privada RSA parseable");
  }

  return {
    rutEmisor: normalizeRut(rutRaw),
    razonSocial,
    tipoDte: Number(tipoRaw),
    folioDesde,
    folioHasta,
    fechaAutorizacion,
    cafXml: cafBlock,
    rsaskPem,
  };
}

export function cafIncludesFolio(caf: ParsedCaf, folio: number): boolean {
  return folio >= caf.folioDesde && folio <= caf.folioHasta;
}

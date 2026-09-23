import { createHash } from "node:crypto";
import { buildSeedXml, seedFromResponse } from "@/lib/dte/xmlsig";
import type { DteSigner, EstadoEnvio, SiiClient } from "./types";

/**
 * In-process SII stand-in: validates the envelope shape, issues
 * sequential track IDs and reports ACEPTADO for anything it issued.
 * Replaced by the real client as soon as the tenant has an active .p12.
 */
export class MockSiiClient implements SiiClient {
  private counter = 0;

  async enviar(envioXml: string): Promise<{ trackId: string }> {
    if (!envioXml.includes("<EnvioDTE") || !envioXml.includes("<DTE")) {
      throw new Error("Envío inválido: se esperaba <EnvioDTE> con al menos un <DTE>");
    }
    this.counter += 1;
    return { trackId: `MOCK-${String(this.counter).padStart(8, "0")}` };
  }

  async consultarEstado(
    trackId: string,
  ): Promise<{ estado: EstadoEnvio; glosa?: string }> {
    if (!/^MOCK-\d{8}$/.test(trackId)) {
      return { estado: "RECHAZADO", glosa: "TrackID desconocido (mock)" };
    }
    return { estado: "ACEPTADO", glosa: "Documento aprobado (mock SII)" };
  }

  async anularFolio(
    input: { tipoDte: number; folio: number },
  ): Promise<{ ok: boolean; glosa?: string }> {
    if (!Number.isInteger(input.folio) || input.folio < 1) {
      throw new Error(`Folio inválido: ${input.folio}`);
    }
    return { ok: true, glosa: `Folio ${input.tipoDte} N° ${input.folio} anulado (mock SII)` };
  }
}

/** Fill every empty `<SignatureValue>` placeholder deterministically. */
function fillPlaceholders(xml: string): string {
  if (!xml.includes("<SignatureValue></SignatureValue>")) {
    throw new Error("XML sin placeholder de firma");
  }
  const signature = createHash("sha256").update(xml).digest("base64");
  return xml.replace(
    /<SignatureValue><\/SignatureValue>/g,
    `<SignatureValue>${signature}</SignatureValue>`,
  );
}

/**
 * Stands in for the XMLDSIG signature with the emisor's .p12 certificate:
 * fills the empty `<SignatureValue>` placeholders deterministically so the
 * emitted XML is structurally complete. Never valid for the real SII.
 */
export class MockDteSigner implements DteSigner {
  async firmar(dteXml: string): Promise<string> {
    return fillPlaceholders(dteXml);
  }

  async firmarEnvio(envioXml: string): Promise<string> {
    return fillPlaceholders(envioXml);
  }

  async firmarSemilla(seedResponseXml: string): Promise<string> {
    return fillPlaceholders(buildSeedXml(seedFromResponse(seedResponseXml)));
  }
}

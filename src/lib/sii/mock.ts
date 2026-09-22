import { createHash } from "node:crypto";
import type { DteSigner, EstadoEnvio, SiiClient } from "./types";

/**
 * In-process SII stand-in: validates the envelope shape, issues
 * sequential track IDs and reports ACEPTADO for anything it issued.
 * Swap for the real client once the emisor is certified.
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
}

/**
 * Stands in for the XMLDSIG signature with the emisor's .p12 certificate:
 * fills the empty `<SignatureValue>` placeholder deterministically so the
 * emitted XML is structurally complete. Never valid for the real SII.
 */
export class MockDteSigner implements DteSigner {
  async firmar(dteXml: string): Promise<string> {
    const placeholder = "<SignatureValue></SignatureValue>";
    if (!dteXml.includes(placeholder)) {
      throw new Error("XML sin placeholder de firma");
    }
    const signature = createHash("sha256").update(dteXml).digest("base64");
    return dteXml.replace(placeholder, `<SignatureValue>${signature}</SignatureValue>`);
  }
}

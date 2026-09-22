/**
 * Ports for everything that talks to the SII or signs DTE XML.
 *
 * Two implementations exist: the in-process mock (used until the emisor
 * is certified) and the real adapters (XMLDSIG with the tenant's .p12 +
 * SOAP/multipart against maullin.sii.cl or palena.sii.cl). The factory
 * in `index.ts` picks automatically based on the active certificate.
 */

export type EstadoEnvio = "PENDIENTE" | "ACEPTADO" | "RECHAZADO";

export interface SiiClient {
  /** Upload an `<EnvioDTE>` envelope and get a track ID back. */
  enviar(envioXml: string): Promise<{ trackId: string }>;
  /** Query the fate of a previously uploaded envío. */
  consultarEstado(trackId: string): Promise<{ estado: EstadoEnvio; glosa?: string }>;
}

export interface DteSigner {
  /** Return the DTE XML with its `<Signature>` filled in. */
  firmar(dteXml: string): Promise<string>;
  /** Sign the `<EnvioDTE>` envelope (carátula signature over `<SetDTE>`). */
  firmarEnvio(envioXml: string): Promise<string>;
  /** Turn a raw CrSeed response into a signed `<getToken>` payload. */
  firmarSemilla(seedResponseXml: string): Promise<string>;
}

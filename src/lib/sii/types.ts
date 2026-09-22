/**
 * Ports for everything that talks to the SII or signs DTE XML.
 *
 * Today only mock adapters exist (the emisor is not certified yet);
 * the real ones (OAuth token via api.sii.cl with the .p12 certificate,
 * and XMLDSIG signing) plug in behind the same interfaces.
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
}

/**
 * Real XMLDSIG signer backed by a loaded .p12 certificate.
 * Implements the same port as the mock; swaps in automatically from the
 * adapter factory when the tenant has an active certificate.
 */

import {
  signDteXml,
  signEnvioXml,
  signSeedXml,
  type SignMaterial,
} from "@/lib/dte/xmlsig";
import type { DteSigner } from "./types";

export class SiiDteSigner implements DteSigner {
  constructor(private readonly material: SignMaterial) {}

  async firmar(dteXml: string): Promise<string> {
    return signDteXml(dteXml, this.material);
  }

  async firmarEnvio(envioXml: string): Promise<string> {
    return signEnvioXml(envioXml, this.material);
  }

  async firmarSemilla(seedResponseXml: string): Promise<string> {
    return signSeedXml(seedResponseXml, this.material);
  }
}

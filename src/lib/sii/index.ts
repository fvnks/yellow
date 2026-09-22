import { decryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { MockDteSigner, MockSiiClient } from "./mock";
import { RealSiiClient, siiAmbiente, type SiiAmbiente } from "./client";
import { loadPkcs12, type CertificateMaterial } from "./pkcs12";
import { SiiDteSigner } from "./signer";
import type { DteSigner, SiiClient } from "./types";

export type { DteSigner, EstadoEnvio, SiiClient } from "./types";

export interface SiiAdapters {
  signer: DteSigner;
  client: SiiClient;
  /** "mock" = no active certificate (simulated SII), "real" = live SII. */
  modo: "mock" | "real";
  /** Present only in "real" mode. */
  ambiente?: SiiAmbiente;
}

/**
 * Pick the adapter pair for a tenant: the mock ports while no .p12 is
 * active, the real XMLDSIG signer + SOAP/multipart client afterwards.
 * Throws with a user-facing message when the stored certificate cannot
 * be unlocked (never silently falls back to the mock in that case).
 */
export async function createSiiAdapters(tenantId: string): Promise<SiiAdapters> {
  const cert = await db.siiCertificate.findFirst({
    where: { tenantId, active: true },
    orderBy: { createdAt: "desc" },
  });
  if (!cert) {
    return { signer: new MockDteSigner(), client: new MockSiiClient(), modo: "mock" };
  }

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { rut: true },
  });
  if (!tenant?.rut) {
    throw new Error(
      `El certificado "${cert.nombre}" está activo pero el tenant no tiene RUT de emisor`,
    );
  }

  let material: CertificateMaterial;
  try {
    material = loadPkcs12(
      Buffer.from(decryptSecret(cert.p12Encrypted), "base64"),
      decryptSecret(cert.passwordEncrypted),
    );
  } catch (err) {
    throw new Error(
      `No se pudo abrir el certificado "${cert.nombre}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const ambiente = siiAmbiente();
  const signer = new SiiDteSigner(material);
  const client = new RealSiiClient({
    ambiente,
    rut: tenant.rut,
    cacheKey: `${tenantId}:${cert.id}:${ambiente}`,
    signSeed: (seedResponseXml) => signer.firmarSemilla(seedResponseXml),
  });
  return { signer, client, modo: "real", ambiente };
}

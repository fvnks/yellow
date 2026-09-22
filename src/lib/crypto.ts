/**
 * Secretbox for data that must be encrypted at rest (today: the tenant's
 * SII .p12 blob and its password).
 *
 * AES-256-GCM with a key derived via scrypt from CERT_ENCRYPTION_KEY when
 * set (recommended in production), falling back to DATABASE_URL so uploads
 * work with zero configuration. Output format:
 *
 *   v1.<iv-b64url>.<authTag-b64url>.<ciphertext-b64url>
 *
 * The authenticated tag makes any tampering or wrong-key decryption fail
 * loudly instead of returning garbage.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const VERSION = "v1";
/** Fixed salt: the secret itself provides the entropy. */
const KDF_SALT = "yellow:sii-certificate:v1";

export class DecryptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecryptError";
  }
}

function secretKey(): Buffer {
  const material = process.env.CERT_ENCRYPTION_KEY || process.env.DATABASE_URL;
  if (!material) {
    throw new DecryptError(
      "No hay material para derivar la clave de cifrado (CERT_ENCRYPTION_KEY o DATABASE_URL)",
    );
  }
  return scryptSync(material, KDF_SALT, 32);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(envelope: string): string {
  const parts = envelope.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new DecryptError("Sobre cifrado inválido");
  }
  try {
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const ciphertext = Buffer.from(parts[3], "base64url");
    const decipher = createDecipheriv("aes-256-gcm", secretKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new DecryptError(
      "No se pudo descifrar el secreto (clave de cifrado cambiada o datos dañados)",
    );
  }
}

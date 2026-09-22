/**
 * Shared test fixtures: a freshly generated RSA keypair standing in for
 * the SII-generated RSASK, and a CAF built around it. Used by caf.test
 * and ted.test; never imported by application code.
 */

import { generateKeyPairSync } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

export const pemPriv = privateKey
  .export({ type: "pkcs1", format: "pem" })
  .toString();

export { publicKey };

/** RSASK body without PEM headers (to exercise the raw-base64 path). */
export const rawBase64 = pemPriv
  .replace("-----BEGIN RSA PRIVATE KEY-----", "")
  .replace("-----END RSA PRIVATE KEY-----", "")
  .replace(/\s+/g, "");

export interface CafFixtureOverrides {
  rsask?: string;
  rut?: string;
  td?: string;
  d?: string;
  h?: string;
}

export function cafFixtureXml(overrides?: CafFixtureOverrides): string {
  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<AUTORIZACION>
<CAF version="1.0">
<DA>
<RE>${overrides?.rut ?? "76543210-3"}</RE>
<RS>YELLOW TEST SPA</RS>
<TD>${overrides?.td ?? "33"}</TD>
<RNG><D>${overrides?.d ?? "1000"}</D><H>${overrides?.h ?? "1999"}</H></RNG>
<FA>2026-09-01</FA>
<RSAPK><M>fake</M><E>Aw==</E></RSAPK>
<IDK>100</IDK>
</DA>
<FRMA algoritmo="SHA1withRSA">firmaDelSii</FRMA>
</CAF>
<RSASK>${overrides?.rsask ?? pemPriv}</RSASK>
<RSAPUBK>pub</RSAPUBK>
</AUTORIZACION>`;
}

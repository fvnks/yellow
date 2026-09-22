/**
 * Test-only fixtures: a real RSA keypair wrapped in a genuine PKCS#12
 * container (forged with node-forge), used by the certificate/signature
 * tests. Never imported by application code.
 */

import { generateKeyPairSync } from "node:crypto";
import forge from "node-forge";

export interface TestCertificate {
  p12: Buffer;
  password: string;
  privateKeyPem: string;
  certificatePem: string;
}

export function makeTestCertificate(
  opts: {
    password?: string;
    /** RUT placed in the subject's serialNumber (as Chilean CAs do). */
    rut?: string;
    commonName?: string;
    notBefore?: Date;
    notAfter?: Date;
  } = {},
): TestCertificate {
  const password = opts.password ?? "clave123";
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privateKeyPem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();

  const forgePrivate = forge.pki.privateKeyFromPem(privateKeyPem);
  const forgePublic = forge.pki.publicKeyFromPem(
    publicKey.export({ type: "spki", format: "pem" }).toString(),
  );

  const cert = forge.pki.createCertificate();
  cert.publicKey = forgePublic;
  cert.serialNumber = "01" + forge.util.bytesToHex(forge.random.getBytesSync(8));
  cert.validity.notBefore = opts.notBefore ?? new Date(Date.now() - 24 * 3600_000);
  cert.validity.notAfter = opts.notAfter ?? new Date(Date.now() + 365 * 24 * 3600_000);

  const attrs: forge.pki.CertificateField[] = [
    { name: "commonName", value: opts.commonName ?? "YELLOW TEST CERT" },
    { name: "countryName", value: "CL" },
    { name: "organizationName", value: "Yellow Test SpA" },
  ];
  // NB: forge resolves attributes by `name` (OID lookup); `shortName` only
  // works for the handful present in its _shortNames map (serialNumber is not).
  if (opts.rut) attrs.push({ name: "serialNumber", value: opts.rut });
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: "basicConstraints", cA: false },
    { name: "keyUsage", digitalSignature: true, keyEncipherment: true },
  ]);
  cert.sign(forgePrivate, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(forgePrivate, cert, password, {
    friendlyName: "yellow-test",
    algorithm: "3des",
  });
  const p12 = Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), "binary");

  return { p12, password, privateKeyPem, certificatePem: forge.pki.certificateToPem(cert) };
}

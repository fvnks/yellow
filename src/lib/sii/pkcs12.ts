/**
 * PKCS#12 (.p12/.pfx) loading for SII certificates, via node-forge.
 * Extracts the private key + leaf certificate (matched by public key),
 * plus the metadata the API exposes (subject, RUT, validity dates).
 */

import { X509Certificate } from "node:crypto";
import forge from "node-forge";
import { parseRut } from "@/lib/rut";

export class Pkcs12Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Pkcs12Error";
  }
}

export interface CertificateMaterial {
  privateKeyPem: string;
  certificatePem: string;
}

export interface CertificateInfo {
  /** Comma-joined subject RDNs ("CN=…, O=…"). */
  subject: string;
  /** RUT parsed from the subject (normalized, "765432103"), when present. */
  rut: string | null;
  issuer: string;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
}

export interface LoadedCertificate extends CertificateMaterial, CertificateInfo {}

/** Chilean RUT with or without thousands separators. */
const RUT_RE = /\b\d{1,2}(?:\.\d{3}){2}-[\dkK]\b|\b\d{6,8}-[\dkK]\b/;

/** Compare RSA moduli without leaning on forge's BigInteger typings. */
function sameModulus(a: unknown, b: unknown): boolean {
  const na = (a as { n?: { toString: (radix: number) => string } }).n;
  const nb = (b as { n?: { toString: (radix: number) => string } }).n;
  return !!na && !!nb && na.toString(16) === nb.toString(16);
}

export function loadPkcs12(p12: Buffer, password: string): LoadedCertificate {
  let asn1: forge.asn1.Asn1;
  try {
    asn1 = forge.asn1.fromDer(forge.util.createBuffer(p12.toString("binary")));
  } catch {
    throw new Pkcs12Error("El archivo no es un .p12/PFX válido");
  }

  let parsed: forge.pkcs12.Pkcs12Pfx;
  try {
    parsed = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  } catch {
    throw new Pkcs12Error("No se pudo abrir el .p12: contraseña incorrecta o archivo dañado");
  }

  let keyBags =
    parsed.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
      forge.pki.oids.pkcs8ShroudedKeyBag
    ];
  if (!keyBags || keyBags.length === 0) {
    keyBags = parsed.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag];
  }
  const privateKey = keyBags?.[0]?.key;
  if (!privateKey) throw new Pkcs12Error("El .p12 no contiene una llave privada");

  const certBags = parsed.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];
  const certs = (certBags ?? []).map((bag) => bag.cert).filter((c): c is forge.pki.Certificate => !!c);
  if (certs.length === 0) throw new Pkcs12Error("El .p12 no contiene un certificado");

  // Prefer the certificate whose public key matches the private key (leaf
  // first); fall back to the first bag (single-certificate stores).
  const leaf =
    certs.find((c) => sameModulus(c.publicKey, privateKey)) ?? certs[0];

  const certificatePem = forge.pki.certificateToPem(leaf);
  const privateKeyPem = forge.pki.privateKeyToPem(privateKey as forge.pki.rsa.PrivateKey);

  const x509 = new X509Certificate(certificatePem);
  const subject = x509.subject.split(/[\r\n]+/).filter(Boolean).join(", ");
  const rutMatch = RUT_RE.exec(subject);
  const rut = rutMatch ? parseRut(rutMatch[0]) : null;

  return {
    privateKeyPem,
    certificatePem,
    subject,
    rut,
    issuer: x509.issuer.split(/[\r\n]+/).filter(Boolean).join(", "),
    serialNumber: x509.serialNumber,
    notBefore: x509.validFromDate ?? new Date(x509.validFrom),
    notAfter: x509.validToDate ?? new Date(x509.validTo),
  };
}

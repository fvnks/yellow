import { createPrivateKey, createPublicKey, X509Certificate } from "node:crypto";
import { describe, expect, it } from "vitest";
import { makeTestCertificate } from "./fixtures";
import { loadPkcs12, Pkcs12Error } from "./pkcs12";

// Second precision: DER stores validity with seconds only.
const NOT_BEFORE = new Date("2026-01-01T00:00:00.000Z");
const NOT_AFTER = new Date("2027-01-01T00:00:00.000Z");

describe("loadPkcs12", () => {
  it("extracts key, certificate and metadata from a .p12", () => {
    const fixture = makeTestCertificate({
      rut: "76.543.210-3",
      commonName: "E2E TEST SPA",
      notBefore: NOT_BEFORE,
      notAfter: NOT_AFTER,
    });
    const loaded = loadPkcs12(fixture.p12, fixture.password);

    expect(loaded.subject).toContain("E2E TEST SPA");
    expect(loaded.issuer).toContain("Yellow Test SpA");
    expect(loaded.rut).toBe("765432103");
    expect(loaded.serialNumber).toBeTruthy();
    expect(loaded.notBefore).toEqual(NOT_BEFORE);
    expect(loaded.notAfter).toEqual(NOT_AFTER);

    // The extracted private key must belong to the extracted certificate.
    const x509 = new X509Certificate(loaded.certificatePem);
    expect(x509.checkPrivateKey(createPrivateKey(loaded.privateKeyPem))).toBe(true);
    // And be usable as sign/verify material.
    const jwk = createPublicKey(loaded.certificatePem).export({ format: "jwk" });
    expect(jwk).toHaveProperty("n");
  });

  it("returns rut=null when the subject carries no RUT", () => {
    const fixture = makeTestCertificate();
    expect(loadPkcs12(fixture.p12, fixture.password).rut).toBeNull();
  });

  it("rejects a wrong password with a clear message", () => {
    const fixture = makeTestCertificate();
    expect(() => loadPkcs12(fixture.p12, "contraseña-mala")).toThrow(Pkcs12Error);
    expect(() => loadPkcs12(fixture.p12, "contraseña-mala")).toThrow(/contraseña/);
  });

  it("rejects a file that is not a PKCS#12", () => {
    expect(() => loadPkcs12(Buffer.from("esto no es un p12"), "x")).toThrow(Pkcs12Error);
  });
});

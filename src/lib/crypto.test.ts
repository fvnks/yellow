import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, DecryptError } from "./crypto";

// The key derives from CERT_ENCRYPTION_KEY (or DATABASE_URL in prod);
// local tests provide their own material so no real secret is required.
process.env.CERT_ENCRYPTION_KEY = process.env.CERT_ENCRYPTION_KEY ?? "test-only-material";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a secret", () => {
    const envelope = encryptSecret("clave-del-p12 con acentos áéíñ");
    expect(decryptSecret(envelope)).toBe("clave-del-p12 con acentos áéíñ");
  });

  it("produces a versioned envelope with three base64url parts", () => {
    const envelope = encryptSecret("x");
    const [v, iv, tag, ct] = envelope.split(".");
    expect(v).toBe("v1");
    expect(iv).toBeTruthy();
    expect(tag).toBeTruthy();
    expect(ct).toBeTruthy();
  });

  it("uses a fresh IV: encrypting twice yields different envelopes", () => {
    expect(encryptSecret("igual")).not.toBe(encryptSecret("igual"));
  });

  it("fails loudly on tampered ciphertext", () => {
    const envelope = encryptSecret("secreto");
    const [v, iv, , ct] = envelope.split(".");
    const flipped = ct[0] === "A" ? "B" : "A";
    expect(() => decryptSecret([v, iv, ct.slice(1), flipped + ct.slice(1)].join("."))).toThrow(
      DecryptError,
    );
  });

  it("fails loudly on a malformed envelope", () => {
    expect(() => decryptSecret("basura")).toThrow(DecryptError);
    expect(() => decryptSecret("v2.a.b.c")).toThrow(DecryptError);
  });
});

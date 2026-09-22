import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Password hashing with scrypt (Node built-in — no native deps).
 * Stored format: scrypt$N$r$p$salt(base64)$key(base64)
 */
const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

function derive(
  password: string,
  salt: Buffer,
  keyLen: number,
  opts: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLen, opts, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await derive(password, salt, KEY_LEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

/** Constant-time verification. Returns false on any malformed stored value. */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  try {
    const [algo, nStr, rStr, pStr, saltB64, keyB64] = stored.split("$");
    if (algo !== "scrypt" || !saltB64 || !keyB64) return false;

    const opts = { N: Number(nStr), r: Number(rStr), p: Number(pStr) };
    if (!Number.isInteger(opts.N) || !Number.isInteger(opts.r) || !Number.isInteger(opts.p)) {
      return false;
    }

    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(keyB64, "base64");
    if (salt.length === 0 || expected.length === 0) return false;

    const actual = await derive(password, salt, expected.length, opts);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

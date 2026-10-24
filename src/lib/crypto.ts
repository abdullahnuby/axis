import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  try {
    const [version, saltHex, keyHex] = encoded.split("$");
    if (version !== "scrypt" || !saltHex || !keyHex) return false;
    const expected = Buffer.from(keyHex, "hex");
    const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), expected.length)) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function hexKey(name: string): Buffer {
  const raw = process.env[name];
  if (!raw || !/^[a-f0-9]{64}$/i.test(raw)) {
    throw new Error(`${name} must be a 32-byte key written as 64 hexadecimal characters.`);
  }
  return Buffer.from(raw, "hex");
}

export function encryptMembershipNumber(value: string): string {
  const key = hexKey("DATA_ENCRYPTION_KEY");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptMembershipNumber(value: string): string {
  const [version, ivRaw, tagRaw, dataRaw] = value.split(".");
  if (version !== "v1" || !ivRaw || !tagRaw || !dataRaw) throw new Error("Invalid encrypted membership value.");
  const decipher = createDecipheriv("aes-256-gcm", hexKey("DATA_ENCRYPTION_KEY"), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataRaw, "base64url")), decipher.final()]).toString("utf8");
}

export function membershipFingerprint(value: string): string {
  const normalized = value.replace(/[\s-]/g, "").toUpperCase();
  return createHmac("sha256", hexKey("MEMBERSHIP_HMAC_KEY")).update(normalized).digest("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

import { createCipheriv, createECDH, createPrivateKey, hkdfSync, randomBytes, sign } from "node:crypto";
import { query } from "@/lib/db";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function configuredKeys() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  const publicBytes = decodeBase64Url(publicKey);
  if (publicBytes.length !== 65 || publicBytes[0] !== 4 || decodeBase64Url(privateKey).length !== 32) return null;
  return { publicKey, publicBytes, privateKey };
}

export function getVapidPublicKey(): string | null {
  return configuredKeys()?.publicKey || null;
}

function createVapidAuthorization(endpoint: string, keys: NonNullable<ReturnType<typeof configuredKeys>>): string {
  const audience = new URL(endpoint).origin;
  const header = Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: process.env.VAPID_SUBJECT || process.env.APP_URL || "https://axis-three-omega.vercel.app",
  })).toString("base64url");
  const unsigned = header + "." + claims;
  const x = keys.publicBytes.subarray(1, 33).toString("base64url");
  const y = keys.publicBytes.subarray(33, 65).toString("base64url");
  const privateJwk = { kty: "EC", crv: "P-256", x, y, d: keys.privateKey };
  const keyObject = createPrivateKey({ key: privateJwk, format: "jwk" });
  const signature = sign("sha256", Buffer.from(unsigned), { key: keyObject, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return "vapid t=" + unsigned + "." + signature + ", k=" + keys.publicKey;
}

function encryptPayload(subscription: PushSubscriptionRow, payload: PushPayload): Buffer {
  const clientPublicKey = decodeBase64Url(subscription.p256dh);
  const authSecret = decodeBase64Url(subscription.auth);
  if (clientPublicKey.length !== 65 || clientPublicKey[0] !== 4 || authSecret.length < 16 || authSecret.length > 32) {
    throw new Error("Invalid push subscription key material.");
  }

  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const serverPublicKey = ecdh.getPublicKey(undefined, "uncompressed");
  const sharedSecret = ecdh.computeSecret(clientPublicKey);
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0", "utf8"), clientPublicKey, serverPublicKey]);
  const inputKeyMaterial = Buffer.from(hkdfSync("sha256", sharedSecret, authSecret, keyInfo, 32));
  const salt = randomBytes(16);
  const contentKey = Buffer.from(hkdfSync("sha256", inputKeyMaterial, salt, Buffer.from("Content-Encoding: aes128gcm\0", "utf8"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", inputKeyMaterial, salt, Buffer.from("Content-Encoding: nonce\0", "utf8"), 12));
  const plaintext = Buffer.concat([Buffer.from(JSON.stringify(payload), "utf8"), Buffer.from([2])]);
  const cipher = createCipheriv("aes-128-gcm", contentKey, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);

  const header = Buffer.alloc(21 + serverPublicKey.length);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header[20] = serverPublicKey.length;
  serverPublicKey.copy(header, 21);
  return Buffer.concat([header, ciphertext]);
}

function toArrayBuffer(bytes: Buffer): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function allowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    const host = url.hostname.toLowerCase();
    return host === "fcm.googleapis.com" ||
      host === "push.services.mozilla.com" ||
      host.endsWith(".push.services.mozilla.com") ||
      host.endsWith(".push.apple.com") ||
      host.endsWith(".notify.windows.com");
  } catch {
    return false;
  }
}

async function sendOne(subscription: PushSubscriptionRow, payload: PushPayload, keys: NonNullable<ReturnType<typeof configuredKeys>>) {
  if (!allowedPushEndpoint(subscription.endpoint)) return;
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: createVapidAuthorization(subscription.endpoint, keys),
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
      Urgency: "normal",
    },
    body: toArrayBuffer(encryptPayload(subscription, payload)),
    signal: AbortSignal.timeout(5000),
  });
  if (response.status === 404 || response.status === 410) {
    await query("DELETE FROM push_subscriptions WHERE id=$1", [subscription.id]);
  } else if (!response.ok) {
    console.warn("AXIS push provider rejected a notification", response.status);
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const keys = configuredKeys();
  if (!keys) return;
  try {
    const result = await query<PushSubscriptionRow>(
      "SELECT id,endpoint,p256dh,auth FROM push_subscriptions WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 20",
      [userId],
    );
    await Promise.allSettled(result.rows.map(subscription => sendOne(subscription, payload, keys)));
  } catch (error) {
    // Push delivery must never undo an in-app notification or fail the user action.
    console.warn("AXIS push delivery could not complete", error instanceof Error ? error.message : "push_delivery_error");
  }
}

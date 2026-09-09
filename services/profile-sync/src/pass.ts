/**
 * Golf Buddy Pass — a signed, accountless capability. The buyer pays once
 * (Stripe), we hand back a `pass` string, they paste it into the app's settings,
 * and the app sends it as `X-Golf-Pass` on every /sync/* request.
 *
 * A pass is `<base64url(payload)>.<base64url(HMAC-SHA256(payload, secret))>`.
 * The payload carries no personal data — just when it was issued and what it
 * unlocks. `PASS_SECRET` is shared between this service (verify) and whatever
 * issues passes (here, POST /pass/claim).
 */

export interface PassPayload {
  /** issued-at, epoch seconds */
  iat: number;
  /** capability — only "sync" today */
  kind: "sync";
  /** optional Stripe checkout session id, for support/debugging */
  sid?: string;
}

/** Read a string env var as a boolean flag. Tolerates the literal types
 * `wrangler types` produces for wrangler.jsonc vars. */
export const flagOn = (v: unknown): boolean => v === "true";

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function issuePass(
  secret: string,
  payload: Omit<PassPayload, "iat"> & { iat?: number },
): Promise<string> {
  const full: PassPayload = { iat: Math.floor(Date.now() / 1000), ...payload };
  const body = b64urlEncode(enc.encode(JSON.stringify(full)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return `${body}.${b64urlEncode(sig)}`;
}

export async function verifyPass(
  secret: string | undefined,
  token: string | undefined | null,
): Promise<PassPayload | null> {
  if (!secret || !token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(sig),
      enc.encode(body),
    );
    if (!ok) return null;
    const payload = JSON.parse(dec.decode(b64urlDecode(body))) as PassPayload;
    return payload.kind === "sync" ? payload : null;
  } catch {
    return null;
  }
}

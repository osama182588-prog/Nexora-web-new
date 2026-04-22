/**
 * Discord interaction signature verification.
 *
 * Discord signs every interaction webhook with Ed25519. We verify it
 * using Node's built-in `crypto` (Node ≥ 18 supports Ed25519 keys via
 * the SubtleCrypto-style API + the classic `crypto.verify` shape), so
 * no `tweetnacl`/`discord-interactions` dependency is needed.
 *
 * The public key is published per Discord application and configured
 * via the `DISCORD_PUBLIC_KEY` env var. Without it, verification fails
 * closed.
 */
import { createPublicKey, verify } from "node:crypto";

let cachedKey: ReturnType<typeof createPublicKey> | null = null;
let cachedKeyHex: string | null = null;

function loadKey(publicKeyHex: string) {
  if (cachedKey && cachedKeyHex === publicKeyHex) return cachedKey;
  // Wrap the raw 32-byte Ed25519 key in DER + PEM so `createPublicKey`
  // accepts it. The DER prefix below is the SPKI header for an Ed25519
  // key per RFC 8410.
  const raw = Buffer.from(publicKeyHex, "hex");
  if (raw.length !== 32) {
    throw new Error(
      `DISCORD_PUBLIC_KEY must be 32 bytes (got ${raw.length})`
    );
  }
  const der = Buffer.concat([
    Buffer.from("302a300506032b6570032100", "hex"),
    raw
  ]);
  const pem =
    "-----BEGIN PUBLIC KEY-----\n" +
    der.toString("base64").match(/.{1,64}/g)!.join("\n") +
    "\n-----END PUBLIC KEY-----\n";
  cachedKey = createPublicKey({ key: pem, format: "pem" });
  cachedKeyHex = publicKeyHex;
  return cachedKey;
}

/**
 * Verify the `X-Signature-Ed25519` + `X-Signature-Timestamp` headers
 * against the raw request body. Returns `true` when the signature is
 * valid. Returns `false` for any malformed input — never throws.
 */
export function verifyDiscordSignature(input: {
  signatureHex: string | null;
  timestamp: string | null;
  rawBody: string;
  publicKeyHex: string | undefined;
}): boolean {
  const { signatureHex, timestamp, rawBody, publicKeyHex } = input;
  if (!publicKeyHex || !signatureHex || !timestamp) return false;

  let key;
  try {
    key = loadKey(publicKeyHex);
  } catch {
    return false;
  }

  const signature = Buffer.from(signatureHex, "hex");
  if (signature.length !== 64) return false;

  const message = Buffer.concat([
    Buffer.from(timestamp, "utf8"),
    Buffer.from(rawBody, "utf8")
  ]);

  try {
    return verify(null, message, key, signature);
  } catch {
    return false;
  }
}

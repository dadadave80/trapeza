import { createVerify } from "node:crypto";
import { circleClient } from "@/lib/circle/wallets";

// In-memory cache for Circle webhook public keys. Keyed by X-Circle-Key-Id.
// Circle rotates keys occasionally; on a cache miss we re-fetch from the
// notifications API and refresh the entry.
const _keyCache = new Map<string, { pem: string; at: number }>();
const KEY_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

type VerifyArgs = {
  rawBody: string;
  signature: string | null;
  keyId: string | null;
};

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

// Verify a Circle webhook payload using ECDSA over the raw request body.
// Circle's notifications system signs the body with a per-project private
// key; the matching public key is exposed via getNotificationSignature.
//
// Reference: https://developers.circle.com/wallets/webhook-notifications
export async function verifyCircleWebhook(args: VerifyArgs): Promise<VerifyResult> {
  if (!args.signature) return { ok: false, reason: "missing X-Circle-Signature" };
  if (!args.keyId) return { ok: false, reason: "missing X-Circle-Key-Id" };

  let pem: string;
  try {
    pem = await getPublicKey(args.keyId);
  } catch (err) {
    return {
      ok: false,
      reason: `public key fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    const verifier = createVerify("sha256");
    verifier.update(args.rawBody);
    verifier.end();
    const sigBuf = Buffer.from(args.signature, "base64");
    const valid = verifier.verify(pem, sigBuf);
    return valid ? { ok: true } : { ok: false, reason: "signature mismatch" };
  } catch (err) {
    return {
      ok: false,
      reason: `verify threw: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function getPublicKey(keyId: string): Promise<string> {
  const cached = _keyCache.get(keyId);
  if (cached && Date.now() - cached.at < KEY_TTL_MS) return cached.pem;

  const client = circleClient();
  // The SDK method returns the public-key payload Circle uses for signing
  // notifications. Method takes the subscriptionId positionally. Shape:
  //   { id, algorithm, publicKey, createDate }
  const res = await client.getNotificationSignature(keyId);
  const pem = res.data?.publicKey;
  if (!pem) throw new Error(`no publicKey for keyId ${keyId}`);

  _keyCache.set(keyId, { pem, at: Date.now() });
  return pem;
}

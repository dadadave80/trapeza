import { createHash } from "node:crypto";
import { circleClient } from "@/lib/circle/wallets";
import { ARC } from "@/lib/constants";

export type AnchorResult =
  | { ok: true; circleTxId: string; traceHash: `0x${string}` }
  | { ok: false; reason: string; traceHash: `0x${string}` };

// Computes sha256(JSON.stringify(payload)) → 0x-prefixed hex (bytes32).
export function hashTrace(payload: unknown): `0x${string}` {
  const json = JSON.stringify(payload);
  const hex = createHash("sha256").update(json).digest("hex");
  return `0x${hex}` as `0x${string}`;
}

// Anchors a 32-byte trace hash by calling TraceAnchor.anchor(bytes32) via the
// developer-controlled wallets SDK (NOT the SCP client — per
// docs/circlefin-skills/use-smart-contract-platform.md "Best Practices":
// "NEVER call write operations on the SCP client").
//
// Returns { ok: false } and a reason if TRACE_ANCHOR_ADDRESS is not set yet
// (e.g. when SCP hasn't been used to deploy the contract). The caller can
// persist the trace hash even when anchoring is skipped.
export async function anchorTrace(args: {
  walletId: string;
  payload: unknown;
}): Promise<AnchorResult> {
  const traceHash = hashTrace(args.payload);
  const contractAddress = process.env.TRACE_ANCHOR_ADDRESS as `0x${string}` | undefined;
  if (!contractAddress) {
    return { ok: false, reason: "TRACE_ANCHOR_ADDRESS not set", traceHash };
  }

  const client = circleClient();
  try {
    const res = await client.createContractExecutionTransaction({
      walletId: args.walletId,
      contractAddress,
      abiFunctionSignature: "anchor(bytes32)",
      abiParameters: [traceHash],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      idempotencyKey: crypto.randomUUID(),
    });
    const txId = res.data?.id;
    if (!txId) return { ok: false, reason: "no txn id returned", traceHash };
    return { ok: true, circleTxId: txId, traceHash };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
      traceHash,
    };
  }
}

// Re-export the configured contract address so callers can persist it
// alongside the decision row for explorer linking once the txn confirms.
export function traceAnchorAddress(): `0x${string}` | undefined {
  try {
    return ARC.traceAnchor();
  } catch {
    return undefined;
  }
}

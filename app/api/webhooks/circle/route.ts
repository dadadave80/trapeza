import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/db/client";
import { verifyCircleWebhook } from "@/lib/circle/webhooks";

export const dynamic = "force-dynamic";

// Circle webhook receiver for Developer-Controlled Wallets txn state
// changes. Verifies X-Circle-Signature (ECDSA-SHA256 over the raw body)
// against a public key fetched via getNotificationSignature — without
// this anyone could POST and flip "executed" on arbitrary decisions.
//
// Set the public URL of this route in Circle Developer Console → Webhooks
// after deploy. The cron-driven polling loop is the fallback path.

type CircleWebhookPayload = {
  notificationId?: string;
  notificationType?: string;
  notification?: {
    id?: string;            // transaction id
    state?: string;         // INITIATED | ... | COMPLETE | FAILED | DENIED | CANCELLED
    txHash?: string;
    blockchain?: string;
  };
};

const TERMINAL_STATES = new Set(["COMPLETE", "FAILED", "DENIED", "CANCELLED"]);

export async function POST(req: Request) {
  // Read the raw body before parsing — signature verification depends on
  // the exact bytes Circle signed, not on the re-stringified JSON.
  const rawBody = await req.text();

  const verify = await verifyCircleWebhook({
    rawBody,
    signature: req.headers.get("x-circle-signature"),
    keyId: req.headers.get("x-circle-key-id"),
  });

  if (!verify.ok) {
    // Don't echo the failure reason to the caller; just refuse. Reason
    // goes to the function log so we can diagnose without leaking
    // verification details to attackers.
    console.warn(`[webhooks/circle] rejected: ${verify.reason}`);
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: CircleWebhookPayload;
  try {
    body = JSON.parse(rawBody) as CircleWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.notification?.id) {
    return NextResponse.json({ error: "missing notification.id" }, { status: 400 });
  }

  const { id: circleTxId, state, txHash } = body.notification;
  if (!state) return NextResponse.json({ ok: true, skipped: "no state" });

  const supabase = supabaseService();
  const update: Record<string, unknown> = {};
  if (TERMINAL_STATES.has(state)) {
    update.executed = state === "COMPLETE";
  }
  if (txHash) update.arc_tx_hash = txHash;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, ignored: state });
  }

  const { error } = await supabase
    .from("decisions")
    .update(update)
    .eq("circle_tx_id", circleTxId);

  if (error) {
    return NextResponse.json({ error: "db", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, circleTxId, state, applied: update });
}

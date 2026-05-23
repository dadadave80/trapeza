import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/db/client";

export const dynamic = "force-dynamic";

// Minimal Circle webhook receiver for Developer-Controlled Wallets txn
// state changes. Signature verification (X-Circle-Signature +
// X-Circle-Key-Id) is TODO — Circle exposes the public key via
// getNotificationSignature; without it this endpoint is best-effort.
// The agent loop also polls txn state on every tick as a fallback.
//
// Set the public URL of this route in Circle Developer Console → Webhooks
// once the contract is deployed.

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
  const body = (await req.json().catch(() => null)) as CircleWebhookPayload | null;
  if (!body?.notification?.id) {
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

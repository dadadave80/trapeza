/**
 * Full-agent-loop E2E. Looks up the Supabase user that owns the given
 * Circle wallet, runs regime → decide → execute → anchor for them, and
 * prints decision + tx hashes. Bypasses the rate limit so it's safe to
 * run back-to-back.
 *
 * Usage:
 *   bun run scripts/agent-run-e2e.ts <circleWalletId>
 */
import { runForUser, type UserCtx } from "@/lib/agent/run";
import { supabaseService } from "@/lib/db/client";
import { ARC_DISPLAY } from "@/lib/constants";

const walletId = process.argv[2];
if (!walletId) {
  console.error("usage: bun run scripts/agent-run-e2e.ts <circleWalletId>");
  process.exit(1);
}

const svc = supabaseService();
const { data: row, error } = await svc
  .from("users")
  .select("id, goal, circle_wallet_id, arc_address")
  .eq("circle_wallet_id", walletId)
  .maybeSingle();

if (error) {
  console.error("db read failed:", error.message);
  process.exit(1);
}
if (!row || !row.arc_address || !row.goal || !row.circle_wallet_id) {
  console.error("no fully-onboarded user owns walletId", walletId);
  console.error("row:", row);
  process.exit(1);
}

console.error("\n▶ Agent E2E");
console.error(`  user.id    ${row.id}`);
console.error(`  goal       ${row.goal}`);
console.error(`  walletId   ${row.circle_wallet_id}`);
console.error(`  address    ${row.arc_address}\n`);

const t0 = Date.now();
const result = await runForUser(row as UserCtx, { bypassRateLimit: true });
const elapsedMs = Date.now() - t0;

console.error("─".repeat(60));
console.error(`AGENT RUN COMPLETE in ${(elapsedMs / 1000).toFixed(1)}s`);
console.error("─".repeat(60));

if ("skipped" in result && result.skipped) {
  console.error(`SKIPPED: ${result.skipped}`);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

const r = result as Extract<typeof result, { regime: unknown }>;
console.error(`regime    ${r.regime.regime}  (conf ${r.regime.confidence}, shift ${r.regime.regime_shift_candidate})`);
console.error(`brief     ${r.regime.brief}`);
console.error("");
console.error(`target    USDC ${(r.decision.target_weights.usdc * 100).toFixed(1)}%  EURC ${(r.decision.target_weights.eurc * 100).toFixed(1)}%  cirBTC ${(r.decision.target_weights.cirbtc * 100).toFixed(1)}%`);
console.error(`rebalance_now: ${r.decision.rebalance_now}`);
console.error(`willRebalance: ${r.plan.willRebalance} (${r.plan.legs.length} leg${r.plan.legs.length === 1 ? "" : "s"})`);
console.error(`executed:      ${r.executed}${r.partial ? " (partial)" : ""}`);
console.error("");
console.error(`reasoning: ${r.decision.reasoning}`);
console.error("");

if (r.swaps.length > 0) {
  console.error("SWAPS");
  console.error("─".repeat(60));
  for (const s of r.swaps) {
    console.error(`  ${s.from} → ${s.to}  ${s.amountIn} in  →  ${s.amountOut ?? "(?)"} out  ($${s.amountUsd.toFixed(2)})`);
    if (s.error) console.error(`    ERROR: ${s.error}`);
    if (s.txHash) console.error(`    arcscan: ${ARC_DISPLAY.explorerUrl}/tx/${s.txHash}`);
  }
  console.error("");
}

if (r.anchor.ok) {
  console.error(`trace anchored: ${r.anchor.traceHash}`);
  console.error(`  circle tx    ${r.anchor.circleTxId}`);
} else {
  console.error(`trace NOT anchored: ${r.anchor.reason}`);
}

console.error(`\ndecision id   ${r.decisionId}\n`);
console.error(r.executed ? "✓ Agent run completed with executed swaps" : "○ Agent run completed (no swaps)");

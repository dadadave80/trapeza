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

// runForUser's return type is a union of skipped/full shapes that share some
// fields but not others — TS can't narrow purely on key presence, so we just
// JSON-dump the result. The structured fields below are exactly the same
// keys the agent writes to the `decisions` table; cross-reference there for
// type safety.
console.log(JSON.stringify(result, null, 2));

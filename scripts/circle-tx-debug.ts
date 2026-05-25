/** Quick read of a Circle DCW transaction by id. Useful for diagnosing
 *  FAILED states from broadcast scripts.
 *
 *  Usage: bun run scripts/circle-tx-debug.ts <circleTxId>
 */
import { circleClient } from "@/lib/circle/wallets";

const txId = process.argv[2];
if (!txId) {
  console.error("usage: bun run scripts/circle-tx-debug.ts <circleTxId>");
  process.exit(1);
}
const dcw = circleClient();
const res = await dcw.getTransaction({ id: txId });
console.log(JSON.stringify(res.data?.transaction, null, 2));

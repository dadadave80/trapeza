/**
 * One-off: create the Circle developer-controlled wallet set.
 *
 * Usage:
 *   bun run create-wallet-set            # creates a fresh set named "trapeza"
 *   bun run create-wallet-set "my-name"  # custom set name
 *
 * Requires CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET in .env.local.
 * Prints the returned wallet set id — paste into .env.local as CIRCLE_WALLET_SET_ID.
 */
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
if (!apiKey) throw new Error("Missing CIRCLE_API_KEY in env");
if (!entitySecret) throw new Error("Missing CIRCLE_ENTITY_SECRET in env");

const name = process.argv[2] ?? "trapeza";

const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

const res = await client.createWalletSet({
  name,
  idempotencyKey: crypto.randomUUID(),
});

const id = res.data?.walletSet?.id;
if (!id) {
  console.error("No wallet set id returned. Raw response:");
  console.error(JSON.stringify(res.data, null, 2));
  process.exit(1);
}

console.log(id);
console.error(`Created wallet set "${name}" with id ${id}.`);
console.error("Paste this into .env.local as CIRCLE_WALLET_SET_ID, then redeploy.");

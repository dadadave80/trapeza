/**
 * End-to-end App Kit swap smoke test. Proves the swap path works against
 * a real wallet on Arc Testnet before letting the agent loose.
 *
 * Usage:
 *   bun run swap-test                            # default: 0.50 USDC → EURC
 *   bun run swap-test EURC cirBTC 0.001          # custom tokenIn tokenOut amount
 *
 * Required env (Vercel + local):
 *   CIRCLE_API_KEY
 *   CIRCLE_ENTITY_SECRET
 *   CIRCLE_DEPLOY_WALLET_ID   — any funded Circle wallet on Arc Testnet
 *   KIT_KEY                   — App Kit kit key from Circle Console
 *
 * Wallet must hold the input token + a few cents of USDC for gas.
 */
import { AppKit } from "@circle-fin/app-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";
import { circleClient } from "@/lib/circle/wallets";
import { APPKIT_ARC_CHAIN } from "@/lib/constants";

const TOKENS = ["USDC", "EURC", "cirBTC"] as const;
type TokenSymbol = (typeof TOKENS)[number];

const tokenIn = (process.argv[2] ?? "USDC") as TokenSymbol;
const tokenOut = (process.argv[3] ?? "EURC") as TokenSymbol;
const amountIn = process.argv[4] ?? "0.50";

if (!TOKENS.includes(tokenIn) || !TOKENS.includes(tokenOut)) {
  console.error(`Token must be one of: ${TOKENS.join(", ")}`);
  process.exit(1);
}
if (tokenIn === tokenOut) {
  console.error("tokenIn and tokenOut must differ");
  process.exit(1);
}

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
const walletId = process.env.CIRCLE_DEPLOY_WALLET_ID;
const kitKey = process.env.KIT_KEY;
if (!apiKey || !entitySecret) {
  console.error("Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET");
  process.exit(1);
}
if (!walletId) {
  console.error("Missing CIRCLE_DEPLOY_WALLET_ID — set this to a funded Circle wallet id");
  process.exit(1);
}
if (!kitKey) {
  console.error("Missing KIT_KEY");
  process.exit(1);
}

console.error(`\n▶ Swap test`);
console.error(`  ${amountIn} ${tokenIn}  →  ${tokenOut}`);
console.error(`  walletId  ${walletId}`);
console.error(`  chain     ${APPKIT_ARC_CHAIN}\n`);

// Look up the wallet address so App Kit knows what to sign for.
const client = circleClient();
const walletRes = await client.getWallet({ id: walletId });
const address = walletRes.data?.wallet?.address;
if (!address) {
  console.error("Could not resolve wallet address from walletId");
  process.exit(1);
}
console.error(`  address   ${address}\n`);

const adapter = createCircleWalletsAdapter({ apiKey, entitySecret });
const kit = new AppKit();

console.error("…sending swap (this can take 30–60s on Arc Testnet)\n");
const result = await kit.swap({
  from: {
    adapter,
    chain: APPKIT_ARC_CHAIN,
    address: address as `0x${string}`,
  },
  tokenIn,
  tokenOut,
  amountIn,
  config: { kitKey },
});

console.error("\n✓ Swap complete\n");
console.log(JSON.stringify(result, null, 2));
console.error(
  `\n▶ Explorer: https://testnet.arcscan.app/tx/${result.txHash}\n`,
);

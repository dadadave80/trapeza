/**
 * E2E smoke test for the mock-token swap path. Fires one synthetic leg
 * through executeRebalance — same code the agent runs — and prints arcscan
 * links so you can verify the Swapped event landed.
 *
 * Usage:
 *   bun run scripts/swap-mock-e2e.ts                    # default: 1 USDC → EURC
 *   bun run scripts/swap-mock-e2e.ts USDC cirBTC 2      # custom: 2 USDC → cirBTC
 *
 * Required env: CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET, CIRCLE_DEPLOY_WALLET_ID
 *
 * What it does:
 *   1. Resolves the deploy-wallet address.
 *   2. Reads mock-token balances + CoinGecko prices.
 *   3. Auto-mints 100 mock USDC if the wallet is empty.
 *   4. Constructs a single Leg ($amount of tokenIn → tokenOut) and calls
 *      executeRebalance — the real production path.
 *   5. Prints the approve + swap arcscan links + before/after balances.
 */
import { circleClient } from "@/lib/circle/wallets";
import { readBalances } from "@/lib/arc/balances";
import { executeRebalance, type AssetKey } from "@/lib/agent/execute";
import { ARC, ARC_DISPLAY } from "@/lib/constants";

const TOKENS: AssetKey[] = ["usdc", "eurc", "cirbtc"];
type CliToken = "USDC" | "EURC" | "cirBTC";
const PARSE: Record<CliToken, AssetKey> = { USDC: "usdc", EURC: "eurc", cirBTC: "cirbtc" };

const cliIn = (process.argv[2] ?? "USDC") as CliToken;
const cliOut = (process.argv[3] ?? "EURC") as CliToken;
const cliAmount = Number(process.argv[4] ?? "1"); // amount in tokenIn units

if (!(cliIn in PARSE) || !(cliOut in PARSE)) {
  console.error(`Token must be one of: USDC, EURC, cirBTC`);
  process.exit(1);
}
if (cliIn === cliOut) {
  console.error("tokenIn and tokenOut must differ");
  process.exit(1);
}
if (!Number.isFinite(cliAmount) || cliAmount <= 0) {
  console.error("amount must be a positive number");
  process.exit(1);
}

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
const walletId = process.env.CIRCLE_DEPLOY_WALLET_ID;
if (!apiKey || !entitySecret) {
  console.error("Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET");
  process.exit(1);
}
if (!walletId) {
  console.error("Missing CIRCLE_DEPLOY_WALLET_ID");
  process.exit(1);
}

const tokenIn = PARSE[cliIn];
const tokenOut = PARSE[cliOut];

console.error("\n▶ Mock-swap E2E");
console.error(`  ${cliAmount} ${cliIn}  →  ${cliOut}`);
console.error(`  walletId   ${walletId}`);
console.error(`  router     ${ARC.mockSwap() ?? "(unset, will use burn+mint fallback)"}`);
console.error("");

const dcw = circleClient();
const walletRes = await dcw.getWallet({ id: walletId });
const address = walletRes.data?.wallet?.address as `0x${string}` | undefined;
if (!address) {
  console.error("Could not resolve wallet address");
  process.exit(1);
}
console.error(`  address    ${address}\n`);

async function snapshot(label: string) {
  const b = await readBalances(address!);
  console.error(`  [${label}] USDC=${b.usdc.toFixed(4)}  EURC=${b.eurc.toFixed(4)}  cirBTC=${b.cirbtc.toFixed(8)}`);
  console.error(`            total $${b.total.toFixed(2)}  (prices: EURC $${b.prices.eurc}, cirBTC $${b.prices.cirbtc})\n`);
  return b;
}

const before = await snapshot("before");

// Auto-faucet 100 mock USDC if the wallet doesn't have enough of the input
// token to satisfy the swap. Skip if input == USDC because we'd need to also
// faucet for whatever's missing.
const tokenInBalance = before[tokenIn] as number;
if (tokenInBalance < cliAmount * 1.05) {
  const tokenAddr = (
    tokenIn === "usdc"
      ? ARC.usdc()
      : tokenIn === "eurc"
        ? ARC.eurc()
        : ARC.cirbtc()
  );
  const decimals = tokenIn === "cirbtc" ? 6 : 6;
  const faucetAmount = Math.max(cliAmount * 2, tokenIn === "cirbtc" ? 0.01 : 100);
  const raw = BigInt(Math.round(faucetAmount * 10 ** decimals));
  console.error(`▶ Wallet short on ${cliIn} (${tokenInBalance}). Auto-faucet ${faucetAmount} ${cliIn}…`);
  const res = await dcw.createContractExecutionTransaction({
    walletId,
    contractAddress: tokenAddr,
    abiFunctionSignature: "mint(address,uint256)",
    abiParameters: [address, raw.toString()],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    idempotencyKey: crypto.randomUUID(),
  });
  const id = res.data?.id;
  if (!id) {
    console.error("  faucet returned no tx id");
    process.exit(1);
  }
  console.error(`  faucet circle tx ${id} … polling`);
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const t = await dcw.getTransaction({ id });
    const state = t.data?.transaction?.state;
    if (state === "COMPLETE") {
      const h = t.data?.transaction?.txHash;
      console.error(`  faucet confirmed · ${ARC_DISPLAY.explorerUrl}/tx/${h}\n`);
      break;
    }
    if (["FAILED", "DENIED", "CANCELLED"].includes(state ?? "")) {
      console.error(`  faucet ended ${state}`);
      process.exit(1);
    }
  }
  await snapshot("post-faucet");
}

// Construct a synthetic leg in USD. amountUsd = cliAmount × tokenIn price.
// The other leg is the opposite sign on tokenOut. Other token has delta=0.
const balancesNow = await readBalances(address);
const inPrice = balancesNow.prices[tokenIn];
const swapUsd = cliAmount * inPrice;
const legs = TOKENS.map((t) => {
  if (t === tokenIn) return { token: t, deltaUsd: -swapUsd };
  if (t === tokenOut) return { token: t, deltaUsd: swapUsd };
  return { token: t, deltaUsd: 0 };
});

console.error(`▶ Executing rebalance: ${cliAmount} ${cliIn} (~$${swapUsd.toFixed(2)}) → ${cliOut}\n`);

const result = await executeRebalance({
  walletId,
  walletAddress: address,
  legs,
  balances: balancesNow,
});

console.error("─".repeat(60));
console.error("SWAPS");
console.error("─".repeat(60));
for (const s of result.swaps) {
  console.error(`  ${s.from} → ${s.to}  ${s.amountIn} in  →  ${s.amountOut ?? "(?)"} out  ($${s.amountUsd.toFixed(2)})`);
  if (s.error) console.error(`    ERROR: ${s.error}`);
  if (s.txHash) console.error(`    arcscan: ${ARC_DISPLAY.explorerUrl}/tx/${s.txHash}`);
}
console.error(`  executed: ${result.executed}`);
console.error("");

await snapshot("after");

if (!result.executed) {
  console.error("✗ FAILED — see swap errors above");
  process.exit(1);
}
console.error("✓ Done — verify the Swapped event on arcscan above");

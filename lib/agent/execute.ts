import { parseUnits } from "viem";
import { circleClient } from "@/lib/circle/wallets";
import { ARC, REBALANCE_THRESHOLD } from "@/lib/constants";
import type { TargetWeights } from "@/lib/types";
import type { TokenBalances } from "@/lib/arc/balances";

export type AssetKey = "usdc" | "eurc" | "cirbtc";
export type TokenSymbol = "USDC" | "EURC" | "cirBTC";

const SYMBOL: Record<AssetKey, TokenSymbol> = {
  usdc: "USDC",
  eurc: "EURC",
  cirbtc: "cirBTC",
};

// All three hackathon mocks are 6dp — see lib/constants.ts.
const TOKEN_DECIMALS: Record<AssetKey, number> = {
  usdc: 6,
  eurc: 6,
  cirbtc: 6,
};

// Standard burn address. We use transfer-to-sink instead of a real burn
// because the Solady mocks don't expose a public burn — but the effect on the
// rebalance loop (source balance decreases, total supply effectively shrinks)
// is the same.
const SINK_ADDRESS = "0x000000000000000000000000000000000000dEaD" as const;

// Delta is denominated in USD now (was raw token units before — wrong for
// cirBTC at $60k+/unit). Conversion to per-token amountIn happens at swap
// time via the token's USD price snapshot from TokenBalances.
export type Leg = { token: AssetKey; deltaUsd: number };

export type SwapAttempt = {
  from: AssetKey;
  to: AssetKey;
  amountIn: string;
  amountUsd: number;
  txHash?: string;
  amountOut?: string;
  error?: string;
};

export type ExecutionResult = {
  swaps: SwapAttempt[];
  executed: boolean;
};

// Plan the swap legs to reach `target` weights from `current` USD-priced
// balances. Drift is measured in USD as a fraction of total USD value.
export function planRebalance(
  current: TokenBalances,
  target: TargetWeights,
): { legs: Leg[]; willRebalance: boolean; total: number } {
  const total = current.total; // USD-equivalent total
  if (total <= 0) return { legs: [], willRebalance: false, total };

  const desired_usd: Record<AssetKey, number> = {
    usdc: target.usdc * total,
    eurc: target.eurc * total,
    cirbtc: target.cirbtc * total,
  };

  const legs: Leg[] = (["usdc", "eurc", "cirbtc"] as const).map((t) => ({
    token: t,
    deltaUsd: desired_usd[t] - current.totals_usd[t],
  }));

  const maxDrift = Math.max(...legs.map((l) => Math.abs(l.deltaUsd) / total));
  return { legs, willRebalance: maxDrift > REBALANCE_THRESHOLD, total };
}

// Route each negative-delta leg into the largest positive-delta sink. For a
// 3-asset basket this collapses to at most 2 swaps. Each swap is two on-chain
// txs against the hackathon mocks: transfer-to-sink on the source, then mint
// on the destination, both signed by the user's Circle DCW wallet.
export async function executeRebalance(args: {
  walletId: string;
  walletAddress: `0x${string}`;
  legs: Leg[];
  balances: TokenBalances;
}): Promise<ExecutionResult> {
  // Skip negligible deltas (< $0.50 either way) — not worth the gas.
  const MIN_USD = 0.5;
  const sources = args.legs
    .filter((l) => l.deltaUsd < -MIN_USD)
    .sort((a, b) => a.deltaUsd - b.deltaUsd); // most negative first
  const sinks = args.legs
    .filter((l) => l.deltaUsd > MIN_USD)
    .sort((a, b) => b.deltaUsd - a.deltaUsd);

  const swaps: SwapAttempt[] = [];

  for (const src of sources) {
    let remainingUsd = -src.deltaUsd;
    for (const sink of sinks) {
      if (sink.deltaUsd <= 0 || remainingUsd <= 0) continue;
      const amountUsd = Math.min(remainingUsd, sink.deltaUsd);

      const srcPrice = args.balances.prices[src.token];
      const sinkPrice = args.balances.prices[sink.token];
      if (!srcPrice || srcPrice <= 0 || !sinkPrice || sinkPrice <= 0) {
        swaps.push({
          from: src.token,
          to: sink.token,
          amountIn: "0",
          amountUsd,
          error: `missing USD price (src=${srcPrice}, sink=${sinkPrice})`,
        });
        return { swaps, executed: false };
      }

      const amountInTokens = amountUsd / srcPrice;
      const amountOutTokens = amountUsd / sinkPrice;
      const amountIn = amountInTokens.toFixed(TOKEN_DECIMALS[src.token]);
      const amountOut = amountOutTokens.toFixed(TOKEN_DECIMALS[sink.token]);

      const attempt: SwapAttempt = {
        from: src.token,
        to: sink.token,
        amountIn,
        amountUsd,
      };

      try {
        const result = await mockSwap({
          walletId: args.walletId,
          walletAddress: args.walletAddress,
          tokenIn: src.token,
          tokenOut: sink.token,
          amountIn,
          amountOut,
        });
        attempt.txHash = result.txHash;
        attempt.amountOut = result.amountOut;
      } catch (err) {
        attempt.error = err instanceof Error ? err.message : String(err);
        swaps.push(attempt);
        return { swaps, executed: false };
      }

      swaps.push(attempt);
      sink.deltaUsd -= amountUsd;
      remainingUsd -= amountUsd;
    }
  }

  return { swaps, executed: swaps.length > 0 && swaps.every((s) => s.txHash) };
}

// One-leg "swap" against the hackathon mocks. Two implementations: when
// ARC_MOCKSWAP_ADDRESS is set the agent routes through the MockSwap router
// (one tx per leg + a clean Swapped event); otherwise it falls back to the
// transfer-to-sink + mint pattern (two txs per leg, no rich event). Both
// trust the caller's `amountOut` — typically derived from the same CoinGecko
// snapshot the decision was made on, so the rebalance stays self-consistent.
//
// Returns the *destination* tx's on-chain hash because that's the
// user-visible balance change and the one worth linking on arcscan.
async function mockSwap(args: {
  walletId: string;
  walletAddress: `0x${string}`;
  tokenIn: AssetKey;
  tokenOut: AssetKey;
  amountIn: string;
  amountOut: string;
}): Promise<{ txHash: string; amountOut: string }> {
  const tokenInAddr = TOKEN_ADDR[args.tokenIn]();
  const tokenOutAddr = TOKEN_ADDR[args.tokenOut]();

  const amountInRaw = parseUnits(args.amountIn, TOKEN_DECIMALS[args.tokenIn]);
  const amountOutRaw = parseUnits(args.amountOut, TOKEN_DECIMALS[args.tokenOut]);

  const dcw = circleClient();
  const router = ARC.mockSwap();

  if (router) {
    // Router path. Approve the router for amountIn, then call swap which
    // pulls source via transferFrom, mints destination, and emits Swapped.
    const approveRes = await dcw.createContractExecutionTransaction({
      walletId: args.walletId,
      contractAddress: tokenInAddr,
      abiFunctionSignature: "approve(address,uint256)",
      abiParameters: [router, amountInRaw.toString()],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      idempotencyKey: crypto.randomUUID(),
    });
    const approveTxId = approveRes.data?.id;
    if (!approveTxId) throw new Error(`approve(${SYMBOL[args.tokenIn]}) returned no tx id`);
    await waitForCircleTx(approveTxId);

    const swapRes = await dcw.createContractExecutionTransaction({
      walletId: args.walletId,
      contractAddress: router,
      abiFunctionSignature: "swap(address,address,uint256,uint256)",
      abiParameters: [
        tokenInAddr,
        tokenOutAddr,
        amountInRaw.toString(),
        amountOutRaw.toString(),
      ],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      idempotencyKey: crypto.randomUUID(),
    });
    const swapTxId = swapRes.data?.id;
    if (!swapTxId) throw new Error(`router.swap returned no tx id`);
    const swapHash = await waitForCircleTx(swapTxId);
    return { txHash: swapHash, amountOut: args.amountOut };
  }

  // Fallback path (no router deployed): burn-by-transfer + open mint.
  const burnRes = await dcw.createContractExecutionTransaction({
    walletId: args.walletId,
    contractAddress: tokenInAddr,
    abiFunctionSignature: "transfer(address,uint256)",
    abiParameters: [SINK_ADDRESS, amountInRaw.toString()],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    idempotencyKey: crypto.randomUUID(),
  });
  const burnTxId = burnRes.data?.id;
  if (!burnTxId) throw new Error(`burn(${SYMBOL[args.tokenIn]}) returned no tx id`);
  await waitForCircleTx(burnTxId);

  const mintRes = await dcw.createContractExecutionTransaction({
    walletId: args.walletId,
    contractAddress: tokenOutAddr,
    abiFunctionSignature: "mint(address,uint256)",
    abiParameters: [args.walletAddress, amountOutRaw.toString()],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    idempotencyKey: crypto.randomUUID(),
  });
  const mintTxId = mintRes.data?.id;
  if (!mintTxId) throw new Error(`mint(${SYMBOL[args.tokenOut]}) returned no tx id`);
  const mintHash = await waitForCircleTx(mintTxId);

  return { txHash: mintHash, amountOut: args.amountOut };
}

const TOKEN_ADDR: Record<AssetKey, () => `0x${string}`> = {
  usdc: () => ARC.usdc(),
  eurc: () => ARC.eurc(),
  cirbtc: () => ARC.cirbtc(),
};

// Poll Circle's transaction state until the tx reaches a terminal state. On
// COMPLETE we return the on-chain txHash so callers can link arcscan. On
// FAILED/DENIED/CANCELLED we throw. Long-polls up to ~60s — well under the
// 120s function timeout on /api/agent/run.
const POLL_INTERVAL_MS = 1_500;
const MAX_POLLS = 40; // 40 × 1.5s = 60s

async function waitForCircleTx(circleTxId: string): Promise<string> {
  const dcw = circleClient();
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const res = await dcw.getTransaction({ id: circleTxId });
    const tx = res.data?.transaction;
    const state = tx?.state;
    if (state === "COMPLETE") {
      const hash = tx?.txHash;
      if (!hash) throw new Error(`tx ${circleTxId} COMPLETE without txHash`);
      return hash;
    }
    if (state === "FAILED" || state === "DENIED" || state === "CANCELLED") {
      throw new Error(`tx ${circleTxId} ended in ${state}`);
    }
  }
  throw new Error(`tx ${circleTxId} did not confirm within ${MAX_POLLS * POLL_INTERVAL_MS}ms`);
}

// Weights are USD-fraction of total now (was raw-unit fraction before —
// wrong for cirBTC). Uses the price snapshot on `balances` so it's
// internally consistent with the delta math above.
export function currentWeights(balances: TokenBalances): TargetWeights {
  const total = balances.total;
  if (total <= 0) return { usdc: 1, eurc: 0, cirbtc: 0 };
  return {
    usdc: balances.totals_usd.usdc / total,
    eurc: balances.totals_usd.eurc / total,
    cirbtc: balances.totals_usd.cirbtc / total,
  };
}

import { AppKit } from "@circle-fin/app-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";
import { APPKIT_ARC_CHAIN, REBALANCE_THRESHOLD } from "@/lib/constants";
import type { TargetWeights } from "@/lib/types";
import type { TokenBalances } from "@/lib/arc/balances";

export type AssetKey = "usdc" | "eurc" | "cirbtc";
export type TokenSymbol = "USDC" | "EURC" | "cirBTC";

const SYMBOL: Record<AssetKey, TokenSymbol> = {
  usdc: "USDC",
  eurc: "EURC",
  cirbtc: "cirBTC",
};

// Decimals for human-readable amountIn strings. cirBTC has more precision.
const TOKEN_DECIMALS: Record<AssetKey, number> = {
  usdc: 6,
  eurc: 6,
  cirbtc: 8,
};

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

let _kit: AppKit | null = null;
function kit() {
  if (_kit) return _kit;
  _kit = new AppKit();
  return _kit;
}

let _adapter: ReturnType<typeof createCircleWalletsAdapter> | null = null;
function adapter() {
  if (_adapter) return _adapter;
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  if (!apiKey) throw new Error("Missing CIRCLE_API_KEY");
  if (!entitySecret) throw new Error("Missing CIRCLE_ENTITY_SECRET");
  _adapter = createCircleWalletsAdapter({ apiKey, entitySecret });
  return _adapter;
}

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
// 3-asset basket this collapses to at most 2 swaps. `amountIn` is the
// human-readable amount in tokenIn units, computed by converting USD delta
// → tokenIn units via the price snapshot on `balances`.
export async function executeRebalance(args: {
  walletId: string;
  walletAddress: `0x${string}`;
  legs: Leg[];
  balances: TokenBalances;
}): Promise<ExecutionResult> {
  const kitKey = process.env.KIT_KEY;
  if (!kitKey) {
    return { swaps: [], executed: false };
  }

  // Skip negligible deltas (< $0.50 either way) — not worth the gas.
  const MIN_USD = 0.5;
  const sources = args.legs
    .filter((l) => l.deltaUsd < -MIN_USD)
    .sort((a, b) => a.deltaUsd - b.deltaUsd); // most negative first
  const sinks = args.legs
    .filter((l) => l.deltaUsd > MIN_USD)
    .sort((a, b) => b.deltaUsd - a.deltaUsd);

  const swaps: SwapAttempt[] = [];
  const k = kit();
  const a = adapter();

  for (const src of sources) {
    let remainingUsd = -src.deltaUsd;
    for (const sink of sinks) {
      if (sink.deltaUsd <= 0 || remainingUsd <= 0) continue;
      const amountUsd = Math.min(remainingUsd, sink.deltaUsd);
      // Convert USD → tokenIn units using the price snapshot.
      const srcPrice = args.balances.prices[src.token];
      if (!srcPrice || srcPrice <= 0) {
        swaps.push({
          from: src.token,
          to: sink.token,
          amountIn: "0",
          amountUsd,
          error: `no USD price for ${src.token}`,
        });
        return { swaps, executed: false };
      }
      const amountTokens = amountUsd / srcPrice;
      const amountIn = amountTokens.toFixed(TOKEN_DECIMALS[src.token]);

      const attempt: SwapAttempt = {
        from: src.token,
        to: sink.token,
        amountIn,
        amountUsd,
      };

      try {
        const result = await k.swap({
          from: {
            adapter: a,
            chain: APPKIT_ARC_CHAIN,
            address: args.walletAddress,
          },
          tokenIn: SYMBOL[src.token],
          tokenOut: SYMBOL[sink.token],
          amountIn,
          config: { kitKey },
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

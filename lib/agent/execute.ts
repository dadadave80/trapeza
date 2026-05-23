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

export type Leg = { token: AssetKey; deltaUnits: number };

export type SwapAttempt = {
  from: AssetKey;
  to: AssetKey;
  amountIn: string;
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

// Plan the swap legs to reach `target` weights from `current` balances.
// For hackathon-grade simplicity we treat 1 USDC ≈ 1 EURC ≈ 1 cirBTC in
// "unit" terms; the agent demonstrates the rebalance loop, not perfect
// USD-equivalent accounting. (TODO: price cirBTC via kit.estimateSwap.)
export function planRebalance(
  current: TokenBalances,
  target: TargetWeights,
): { legs: Leg[]; willRebalance: boolean; total: number } {
  const total = current.total;
  if (total <= 0) return { legs: [], willRebalance: false, total };

  const desired: Record<AssetKey, number> = {
    usdc: target.usdc * total,
    eurc: target.eurc * total,
    cirbtc: target.cirbtc * total,
  };

  const legs: Leg[] = (["usdc", "eurc", "cirbtc"] as const).map((t) => ({
    token: t,
    deltaUnits: desired[t] - current[t],
  }));

  const maxDrift = Math.max(...legs.map((l) => Math.abs(l.deltaUnits) / total));
  return { legs, willRebalance: maxDrift > REBALANCE_THRESHOLD, total };
}

// Execute the rebalance by routing each negative-delta leg into the largest
// positive-delta leg. For a 3-asset basket this is at most 2 swaps.
export async function executeRebalance(args: {
  walletId: string;
  walletAddress: `0x${string}`;
  legs: Leg[];
}): Promise<ExecutionResult> {
  const kitKey = process.env.KIT_KEY;
  if (!kitKey) {
    return {
      swaps: [],
      executed: false,
    };
  }

  const sources = args.legs
    .filter((l) => l.deltaUnits < -0.0001)
    .sort((a, b) => a.deltaUnits - b.deltaUnits); // most negative first
  const sinks = args.legs
    .filter((l) => l.deltaUnits > 0.0001)
    .sort((a, b) => b.deltaUnits - a.deltaUnits); // most positive first

  const swaps: SwapAttempt[] = [];
  const k = kit();
  const a = adapter();

  for (const src of sources) {
    let remaining = -src.deltaUnits;
    for (const sink of sinks) {
      if (sink.deltaUnits <= 0 || remaining <= 0) continue;
      const amount = Math.min(remaining, sink.deltaUnits);
      // Round to 6 dp for stables, 8 dp for cirBTC.
      const amountIn = amount.toFixed(src.token === "cirbtc" ? 8 : 6);

      const attempt: SwapAttempt = {
        from: src.token,
        to: sink.token,
        amountIn,
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
        // Stop on first error to avoid cascading failures.
        return { swaps, executed: false };
      }

      swaps.push(attempt);
      sink.deltaUnits -= amount;
      remaining -= amount;
    }
  }

  return { swaps, executed: swaps.length > 0 && swaps.every((s) => s.txHash) };
}

export function currentWeights(balances: TokenBalances): TargetWeights {
  const total = balances.total;
  if (total <= 0) return { usdc: 1, eurc: 0, cirbtc: 0 };
  return {
    usdc: balances.usdc / total,
    eurc: balances.eurc / total,
    cirbtc: balances.cirbtc / total,
  };
}

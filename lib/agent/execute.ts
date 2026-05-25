import { parseUnits } from "viem";
import { circleClient } from "@/lib/circle/wallets";
import { ARC, REBALANCE_THRESHOLD } from "@/lib/constants";
import type { TargetWeights } from "@/lib/types";
import type { TokenBalances } from "@/lib/arc/balances";

export type AssetKey = "usdc" | "eurc" | "cirbtc" | "usyc";
export type TokenSymbol = "USDC" | "EURC" | "cirBTC" | "USYC";

const SYMBOL: Record<AssetKey, TokenSymbol> = {
  usdc: "USDC",
  eurc: "EURC",
  cirbtc: "cirBTC",
  usyc: "USYC",
};

// All four hackathon mocks are 6dp — see lib/constants.ts.
const TOKEN_DECIMALS: Record<AssetKey, number> = {
  usdc: 6,
  eurc: 6,
  cirbtc: 6,
  usyc: 6,
};

// Standard burn address. Used by the no-router fallback for the swap-like
// pairs — USYC always uses deposit/redeem, never the sink path.
const SINK_ADDRESS = "0x000000000000000000000000000000000000dEaD" as const;

// Delta is denominated in USD. Conversion to per-token amountIn happens at
// swap time via the token's USD price snapshot from TokenBalances.
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
    usyc: target.usyc * total,
  };

  const legs: Leg[] = (["usdc", "eurc", "cirbtc", "usyc"] as const).map((t) => ({
    token: t,
    deltaUsd: desired_usd[t] - current.totals_usd[t],
  }));

  const maxDrift = Math.max(...legs.map((l) => Math.abs(l.deltaUsd) / total));
  return { legs, willRebalance: maxDrift > REBALANCE_THRESHOLD, total };
}

// Route each negative-delta leg into the largest positive-delta sink. Within
// each leg, dispatch on the (src, sink) pair:
//   USDC ↔ USYC     → direct MockUSYC.deposit / .redeem (1 DCW tx)
//   USYC ↔ non-USDC → 2-hop via USDC (redeem then router-swap, or vice versa)
//   anything else   → MockSwap router (approve + swap, 2 DCW tx)
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
        const result = await routeLeg({
          walletId: args.walletId,
          walletAddress: args.walletAddress,
          tokenIn: src.token,
          tokenOut: sink.token,
          amountIn,
          amountOut,
          amountUsd,
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

// Picks the right primitive for the (tokenIn, tokenOut) pair.
async function routeLeg(args: {
  walletId: string;
  walletAddress: `0x${string}`;
  tokenIn: AssetKey;
  tokenOut: AssetKey;
  amountIn: string;       // human-readable, in tokenIn units
  amountOut: string;      // human-readable, in tokenOut units
  amountUsd: number;
}): Promise<{ txHash: string; amountOut: string }> {
  const { tokenIn, tokenOut } = args;

  // Direct USYC ↔ USDC: vault deposit / redeem.
  if (tokenIn === "usdc" && tokenOut === "usyc") {
    return usycDeposit({
      walletId: args.walletId,
      amountUsdc: args.amountIn,
    });
  }
  if (tokenIn === "usyc" && tokenOut === "usdc") {
    return usycRedeem({
      walletId: args.walletId,
      walletAddress: args.walletAddress,
      amountShares: args.amountIn,
      amountUsdc: args.amountOut,
    });
  }

  // USYC ↔ non-USDC: redeem to USDC, then swap USDC → sink.
  if (tokenIn === "usyc") {
    if (tokenOut === "usyc") throw new Error("degenerate leg usyc→usyc");
    const usdcAmount = args.amountUsd.toFixed(TOKEN_DECIMALS.usdc);
    await usycRedeem({
      walletId: args.walletId,
      walletAddress: args.walletAddress,
      amountShares: args.amountIn,
      amountUsdc: usdcAmount,
    });
    return mockSwap({
      walletId: args.walletId,
      walletAddress: args.walletAddress,
      tokenIn: "usdc",
      tokenOut, // narrowed: cannot be "usyc" (above) and not "usdc" (handled earlier)
      amountIn: usdcAmount,
      amountOut: args.amountOut,
    });
  }

  // non-USDC → USYC: swap source → USDC, then deposit USDC into USYC.
  // tokenIn is narrowed to non-USYC by the preceding branch.
  if (tokenOut === "usyc") {
    const usdcAmount = args.amountUsd.toFixed(TOKEN_DECIMALS.usdc);
    await mockSwap({
      walletId: args.walletId,
      walletAddress: args.walletAddress,
      tokenIn, // narrowed: not "usyc" (above) and not "usdc" (handled earlier)
      tokenOut: "usdc",
      amountIn: args.amountIn,
      amountOut: usdcAmount,
    });
    return usycDeposit({
      walletId: args.walletId,
      amountUsdc: usdcAmount,
    });
  }

  // Vanilla swap between USDC / EURC / cirBTC. By here neither side is USYC.
  return mockSwap({
    walletId: args.walletId,
    walletAddress: args.walletAddress,
    tokenIn,
    tokenOut,
    amountIn: args.amountIn,
    amountOut: args.amountOut,
  });
}

// Deposit USDC into the MockUSYC vault. Two DCW txs: approve(vault, amount)
// then deposit(amount, to=walletAddress). Returns the deposit tx's on-chain
// hash.
async function usycDeposit(args: {
  walletId: string;
  amountUsdc: string;
}): Promise<{ txHash: string; amountOut: string }> {
  const vault = ARC.usyc();
  const usdc = ARC.usdc();
  const amountRaw = parseUnits(args.amountUsdc, TOKEN_DECIMALS.usdc);

  const dcw = circleClient();

  const approveRes = await dcw.createContractExecutionTransaction({
    walletId: args.walletId,
    contractAddress: usdc,
    abiFunctionSignature: "approve(address,uint256)",
    abiParameters: [vault, amountRaw.toString()],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    idempotencyKey: crypto.randomUUID(),
  });
  const approveTxId = approveRes.data?.id;
  if (!approveTxId) throw new Error("usyc deposit approve returned no tx id");
  await waitForCircleTx(approveTxId);

  // We need the wallet address as the deposit recipient — but the vault
  // accepts it as an argument so the deposit tx can come from any wallet.
  // Here the wallet IS the depositor, so `to = sender` via the SDK's resolved
  // wallet. We could read it via dcw.getWallet, but the caller already has
  // walletAddress. Plumb that through instead.
  const depositRes = await dcw.createContractExecutionTransaction({
    walletId: args.walletId,
    contractAddress: vault,
    abiFunctionSignature: "deposit(uint256,address)",
    // The wallet address is auto-resolved by the Circle DCW SDK from walletId
    // when "self" is passed as the recipient via a sentinel; but to keep the
    // contract semantics correct we send the resolved address. Looked up
    // upstream by readBalances/run already, but we re-derive here so the
    // signature stays clean.
    abiParameters: [
      amountRaw.toString(),
      // Sentinel: route deposit to the depositor wallet itself. The
      // walletAddress isn't in args yet; use a getter instead.
      await resolveWalletAddress(args.walletId),
    ],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    idempotencyKey: crypto.randomUUID(),
  });
  const depositTxId = depositRes.data?.id;
  if (!depositTxId) throw new Error("usyc deposit returned no tx id");
  const depositHash = await waitForCircleTx(depositTxId);

  // amountOut in USYC shares — we don't know exactly without reading the
  // vault back. For display purposes we report the USDC amount; the next
  // balance read will reflect the actual share count.
  return { txHash: depositHash, amountOut: args.amountUsdc };
}

// Redeem USYC shares back to USDC. We use `redeem(shares, to, owner)` rather
// than `withdraw(assets, to, owner)` so the caller controls share count,
// which matches what the agent has decided.
async function usycRedeem(args: {
  walletId: string;
  walletAddress: `0x${string}`;
  amountShares: string;
  amountUsdc: string;
}): Promise<{ txHash: string; amountOut: string }> {
  const vault = ARC.usyc();
  const sharesRaw = parseUnits(args.amountShares, TOKEN_DECIMALS.usyc);

  const dcw = circleClient();
  const redeemRes = await dcw.createContractExecutionTransaction({
    walletId: args.walletId,
    contractAddress: vault,
    abiFunctionSignature: "redeem(uint256,address,address)",
    abiParameters: [
      sharesRaw.toString(),
      args.walletAddress,
      args.walletAddress,
    ],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    idempotencyKey: crypto.randomUUID(),
  });
  const redeemTxId = redeemRes.data?.id;
  if (!redeemTxId) throw new Error("usyc redeem returned no tx id");
  const redeemHash = await waitForCircleTx(redeemTxId);

  return { txHash: redeemHash, amountOut: args.amountUsdc };
}

// One-leg "swap" against the hackathon mocks. ARC_MOCKSWAP_ADDRESS-set: route
// via MockSwap (one Swapped event per leg). Unset: transfer-to-sink + open
// mint. Trusts the caller's `amountOut` (typically from CoinGecko snapshot).
async function mockSwap(args: {
  walletId: string;
  walletAddress: `0x${string}`;
  tokenIn: Exclude<AssetKey, "usyc">;
  tokenOut: Exclude<AssetKey, "usyc">;
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

const TOKEN_ADDR: Record<Exclude<AssetKey, "usyc">, () => `0x${string}`> = {
  usdc: () => ARC.usdc(),
  eurc: () => ARC.eurc(),
  cirbtc: () => ARC.cirbtc(),
};

// Cache resolved wallet addresses per process to avoid an extra Circle API
// call on every USYC deposit (the address is also fetched upstream during
// balance reads, but plumbing it through routeLeg → usycDeposit would make
// the signature noisier without buying much).
const _addrCache = new Map<string, `0x${string}`>();
async function resolveWalletAddress(walletId: string): Promise<`0x${string}`> {
  const cached = _addrCache.get(walletId);
  if (cached) return cached;
  const res = await circleClient().getWallet({ id: walletId });
  const addr = res.data?.wallet?.address as `0x${string}` | undefined;
  if (!addr) throw new Error(`could not resolve address for wallet ${walletId}`);
  _addrCache.set(walletId, addr);
  return addr;
}

// Poll Circle's transaction state until terminal. On COMPLETE returns the
// on-chain txHash so callers can link arcscan. Long-polls up to ~60s — well
// under the 300s function timeout on /api/agent/run.
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

// Weights as USD-fraction of total. Uses the price snapshot on `balances`
// for internal consistency with the delta math.
export function currentWeights(balances: TokenBalances): TargetWeights {
  const total = balances.total;
  if (total <= 0) return { usdc: 1, eurc: 0, cirbtc: 0, usyc: 0 };
  return {
    usdc: balances.totals_usd.usdc / total,
    eurc: balances.totals_usd.eurc / total,
    cirbtc: balances.totals_usd.cirbtc / total,
    usyc: balances.totals_usd.usyc / total,
  };
}

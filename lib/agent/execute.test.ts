import { describe, expect, test } from "bun:test";
import { planRebalance, currentWeights } from "./execute";
import type { TokenBalances } from "@/lib/arc/balances";

function balances(
  usdc: number,
  eurc: number,
  cirbtc: number,
  usyc: number = 0,
  btcPrice = 70_000,
): TokenBalances {
  const prices = { usdc: 1, eurc: 1.1, cirbtc: btcPrice, usyc: 1 };
  const totals_usd = {
    usdc: usdc * prices.usdc,
    eurc: eurc * prices.eurc,
    cirbtc: cirbtc * prices.cirbtc,
    usyc: usyc * prices.usyc,
  };
  const total = totals_usd.usdc + totals_usd.eurc + totals_usd.cirbtc + totals_usd.usyc;
  return {
    usdc,
    eurc,
    cirbtc,
    usyc,
    usyc_assets_usdc: usyc * prices.usyc,
    prices,
    totals_usd,
    total,
    // No P&L in the planner tests — flat values keep planRebalance math clean.
    total_24h_ago: total,
    delta_24h_usd: 0,
    delta_24h_pct: 0,
    price_source: "coingecko",
    fetched_at: "2026-05-24T00:00:00.000Z",
  };
}

describe("currentWeights", () => {
  test("USD-weighted, not unit-weighted (the actual bug we shipped)", () => {
    // 100 USDC ($100) + 0 EURC + 0.001 cirBTC ($70) + 0 USYC
    const b = balances(100, 0, 0.001);
    const w = currentWeights(b);
    // total = $170, so USDC = 100/170 ≈ 0.588, cirBTC = 70/170 ≈ 0.412
    expect(w.usdc).toBeCloseTo(0.588, 2);
    expect(w.eurc).toBeCloseTo(0, 5);
    expect(w.cirbtc).toBeCloseTo(0.412, 2);
    expect(w.usyc).toBeCloseTo(0, 5);
    expect(w.usdc + w.eurc + w.cirbtc + w.usyc).toBeCloseTo(1, 5);
  });

  test("empty wallet defaults to 100% USDC", () => {
    const b = balances(0, 0, 0);
    const w = currentWeights(b);
    expect(w).toEqual({ usdc: 1, eurc: 0, cirbtc: 0, usyc: 0 });
  });

  test("EURC priced at >$1 affects weights correctly", () => {
    // 100 EURC at $1.10 = $110. No other tokens.
    const b = balances(0, 100, 0);
    const w = currentWeights(b);
    expect(w.eurc).toBeCloseTo(1, 5);
  });

  test("USYC counts toward total at share-price (here 1.0)", () => {
    // 100 USYC × $1 = $100; 100 USDC × $1 = $100. 50/50 USDC vs USYC.
    const b = balances(100, 0, 0, 100);
    const w = currentWeights(b);
    expect(w.usdc).toBeCloseTo(0.5, 5);
    expect(w.usyc).toBeCloseTo(0.5, 5);
  });
});

describe("planRebalance", () => {
  test("no rebalance when within threshold", () => {
    // Holding 50/30/0/20 USD-weight, target 51/30/0/19 → max drift 1% < 5%
    const total = 1000;
    const b = balances(510, 272.73, 0, 190); // ~$510 + ~$300 + 0 + $190
    const plan = planRebalance(b, { usdc: 0.51, eurc: 0.30, cirbtc: 0.0, usyc: 0.19 });
    expect(plan.willRebalance).toBe(false);
    expect(plan.total).toBeCloseTo(total, 0);
  });

  test("rebalance when drift > 5%", () => {
    // Holding 80/10/10/0 USD, target 40/20/20/20 → big drift
    const b = balances(800, 90.91, 0.00143, 0);
    const plan = planRebalance(b, { usdc: 0.40, eurc: 0.20, cirbtc: 0.20, usyc: 0.20 });
    expect(plan.willRebalance).toBe(true);
    const usdcLeg = plan.legs.find((l) => l.token === "usdc");
    const usycLeg = plan.legs.find((l) => l.token === "usyc");
    expect(usdcLeg?.deltaUsd).toBeLessThan(0);
    expect(usycLeg?.deltaUsd).toBeGreaterThan(0);
  });

  test("empty wallet returns no rebalance", () => {
    const b = balances(0, 0, 0);
    const plan = planRebalance(b, { usdc: 0.4, eurc: 0.2, cirbtc: 0.2, usyc: 0.2 });
    expect(plan.willRebalance).toBe(false);
    expect(plan.legs).toEqual([]);
  });

  test("legs sum to zero (conservation)", () => {
    const b = balances(800, 90.91, 0.00143, 0);
    const plan = planRebalance(b, { usdc: 0.40, eurc: 0.20, cirbtc: 0.20, usyc: 0.20 });
    const sum = plan.legs.reduce((s, l) => s + l.deltaUsd, 0);
    expect(Math.abs(sum)).toBeLessThan(0.01); // floating-point dust OK
  });
});

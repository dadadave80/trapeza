import { describe, expect, test } from "bun:test";
import { planRebalance, currentWeights } from "./execute";
import type { TokenBalances } from "@/lib/arc/balances";

function balances(usdc: number, eurc: number, cirbtc: number, btcPrice = 70_000): TokenBalances {
  const prices = { usdc: 1, eurc: 1.1, cirbtc: btcPrice };
  const totals_usd = {
    usdc: usdc * prices.usdc,
    eurc: eurc * prices.eurc,
    cirbtc: cirbtc * prices.cirbtc,
  };
  return {
    usdc,
    eurc,
    cirbtc,
    prices,
    totals_usd,
    total: totals_usd.usdc + totals_usd.eurc + totals_usd.cirbtc,
    price_source: "coingecko",
    fetched_at: "2026-05-24T00:00:00.000Z",
  };
}

describe("currentWeights", () => {
  test("USD-weighted, not unit-weighted (the actual bug we shipped)", () => {
    // 100 USDC ($100) + 0 EURC + 0.001 cirBTC ($70)
    const b = balances(100, 0, 0.001);
    const w = currentWeights(b);
    // total = $170, so USDC = 100/170 ≈ 0.588, cirBTC = 70/170 ≈ 0.412
    expect(w.usdc).toBeCloseTo(0.588, 2);
    expect(w.eurc).toBeCloseTo(0, 5);
    expect(w.cirbtc).toBeCloseTo(0.412, 2);
    // Sanity: weights sum to 1.
    expect(w.usdc + w.eurc + w.cirbtc).toBeCloseTo(1, 5);
  });

  test("empty wallet defaults to 100% USDC", () => {
    const b = balances(0, 0, 0);
    const w = currentWeights(b);
    expect(w).toEqual({ usdc: 1, eurc: 0, cirbtc: 0 });
  });

  test("EURC priced at >$1 affects weights correctly", () => {
    // 100 EURC at $1.10 = $110. No other tokens.
    const b = balances(0, 100, 0);
    const w = currentWeights(b);
    expect(w.eurc).toBeCloseTo(1, 5);
  });
});

describe("planRebalance", () => {
  test("no rebalance when within threshold", () => {
    // Holding 50/30/20 USD, target 51/30/19 → max drift 1% < 5%
    const total = 1000;
    const b = balances(510, 273, 0.00271);
    // ~$510 + ~$300 + ~$190 = ~$1000
    const plan = planRebalance(b, { usdc: 0.51, eurc: 0.30, cirbtc: 0.19 });
    expect(plan.willRebalance).toBe(false);
    expect(plan.total).toBeCloseTo(total, 0);
  });

  test("rebalance when drift > 5%", () => {
    // Holding 80/10/10 USD, target 50/30/20 → 30% drift on USDC
    const b = balances(800, 90.91, 0.00143);
    const plan = planRebalance(b, { usdc: 0.50, eurc: 0.30, cirbtc: 0.20 });
    expect(plan.willRebalance).toBe(true);
    // USDC should be negative (need to sell), cirBTC + EURC positive (need more)
    const usdcLeg = plan.legs.find((l) => l.token === "usdc");
    const cirbtcLeg = plan.legs.find((l) => l.token === "cirbtc");
    expect(usdcLeg?.deltaUsd).toBeLessThan(0);
    expect(cirbtcLeg?.deltaUsd).toBeGreaterThan(0);
  });

  test("empty wallet returns no rebalance", () => {
    const b = balances(0, 0, 0);
    const plan = planRebalance(b, { usdc: 0.5, eurc: 0.3, cirbtc: 0.2 });
    expect(plan.willRebalance).toBe(false);
    expect(plan.legs).toEqual([]);
  });

  test("legs sum to zero (conservation)", () => {
    const b = balances(800, 90.91, 0.00143);
    const plan = planRebalance(b, { usdc: 0.50, eurc: 0.30, cirbtc: 0.20 });
    const sum = plan.legs.reduce((s, l) => s + l.deltaUsd, 0);
    expect(Math.abs(sum)).toBeLessThan(0.01); // floating-point dust OK
  });
});

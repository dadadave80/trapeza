import { describe, expect, test } from "bun:test";
import { goalBands } from "@/lib/types";

// clampToBand isn't exported but lives in lib/agent/decide.ts. We mirror
// the implementation here so we can test the math. If the impl changes,
// update this mirror — these tests prove the *intent* (goal bands are
// hard contracts, regardless of what the LLM returns).
function clampToBand(
  w: { usdc: number; eurc: number; cirbtc: number },
  band: (typeof goalBands)[keyof typeof goalBands],
) {
  const cirbtc = Math.min(Math.max(w.cirbtc, band.cirbtc[0]), band.cirbtc[1]);
  let eurc = Math.max(w.eurc, band.eurcMin);
  if (eurc + cirbtc > 1) eurc = Math.max(band.eurcMin, 1 - cirbtc);
  const usdc = Math.max(0, 1 - eurc - cirbtc);
  return { usdc, eurc, cirbtc };
}

describe("clampToBand", () => {
  test("conservative: cirbtc clamped to [0, 0.2], eurc ≥ 0.3", () => {
    const out = clampToBand({ usdc: 0, eurc: 0.1, cirbtc: 0.9 }, goalBands.conservative);
    expect(out.cirbtc).toBe(0.2); // hit upper bound
    expect(out.eurc).toBeGreaterThanOrEqual(0.3);
    expect(out.usdc + out.eurc + out.cirbtc).toBeCloseTo(1, 5);
  });

  test("aggressive: cirbtc clamped to [0.3, 0.7]", () => {
    const out = clampToBand({ usdc: 0.5, eurc: 0.4, cirbtc: 0.1 }, goalBands.aggressive);
    expect(out.cirbtc).toBe(0.3); // hit lower bound
    expect(out.usdc + out.eurc + out.cirbtc).toBeCloseTo(1, 5);
  });

  test("balanced honours eurc floor and band-respects sum", () => {
    const out = clampToBand({ usdc: 0.5, eurc: 0, cirbtc: 0.5 }, goalBands.balanced);
    expect(out.eurc).toBeGreaterThanOrEqual(0.2); // eurcMin
    expect(out.cirbtc).toBeLessThanOrEqual(0.5); // upper bound
    expect(out.usdc + out.eurc + out.cirbtc).toBeCloseTo(1, 5);
  });

  test("model returning all-zero collapses to band floors", () => {
    const out = clampToBand({ usdc: 0, eurc: 0, cirbtc: 0 }, goalBands.aggressive);
    expect(out.cirbtc).toBeGreaterThanOrEqual(0.3);
    expect(out.eurc).toBeGreaterThanOrEqual(0.1);
    expect(out.usdc + out.eurc + out.cirbtc).toBeCloseTo(1, 5);
  });

  test("over-eager cirbtc + already-high eurc shifts eurc down to fit", () => {
    // Aggressive: cirbtc max 0.7, eurc min 0.1. Model says 0.5 eurc + 0.7 cirbtc.
    const out = clampToBand({ usdc: 0, eurc: 0.5, cirbtc: 0.7 }, goalBands.aggressive);
    expect(out.cirbtc).toBe(0.7);
    expect(out.eurc + out.cirbtc).toBeLessThanOrEqual(1);
    expect(out.usdc + out.eurc + out.cirbtc).toBeCloseTo(1, 5);
  });
});

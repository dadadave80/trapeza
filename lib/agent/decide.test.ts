import { describe, expect, test } from "bun:test";
import { goalBands } from "@/lib/types";

// clampToBand isn't exported but lives in lib/agent/decide.ts. We mirror
// the implementation here so we can test the math. If the impl changes,
// update this mirror — these tests prove the *intent* (goal bands are
// hard contracts, regardless of what the LLM returns).
function clampToBand(
  w: { usdc: number; eurc: number; cirbtc: number; usyc: number },
  band: (typeof goalBands)[keyof typeof goalBands],
) {
  const cirbtc = Math.min(Math.max(w.cirbtc, band.cirbtc[0]), band.cirbtc[1]);
  let eurc = Math.max(w.eurc, band.eurcMin);
  let usyc = Math.max(w.usyc, band.usycMin);
  let usdc = Math.max(w.usdc, band.usdcMin);

  let sum = cirbtc + eurc + usyc + usdc;
  if (sum > 1) {
    const excess = sum - 1;
    const eurcExcess = eurc - band.eurcMin;
    const usycExcess = usyc - band.usycMin;
    const usdcExcess = usdc - band.usdcMin;
    const totalExcess = eurcExcess + usycExcess + usdcExcess;
    if (totalExcess > 0) {
      eurc -= (excess * eurcExcess) / totalExcess;
      usyc -= (excess * usycExcess) / totalExcess;
      usdc -= (excess * usdcExcess) / totalExcess;
    }
    sum = cirbtc + eurc + usyc + usdc;
  }
  if (sum < 1) usdc += 1 - sum;
  return { usdc, eurc, cirbtc, usyc };
}

const SUMS_TO_ONE = 5;

describe("clampToBand (4-asset)", () => {
  test("conservative: cirbtc clamped to [0, 0.15], eurc ≥ 0.2, usyc ≥ 0.3", () => {
    const out = clampToBand(
      { usdc: 0, eurc: 0.1, cirbtc: 0.9, usyc: 0 },
      goalBands.conservative,
    );
    expect(out.cirbtc).toBeLessThanOrEqual(0.15);
    expect(out.eurc).toBeGreaterThanOrEqual(0.2 - 1e-9);
    expect(out.usyc).toBeGreaterThanOrEqual(0.3 - 1e-9);
    expect(out.usdc).toBeGreaterThanOrEqual(0.05 - 1e-9);
    expect(out.usdc + out.eurc + out.cirbtc + out.usyc).toBeCloseTo(1, SUMS_TO_ONE);
  });

  test("aggressive: cirbtc clamped to [0.3, 0.65]", () => {
    const out = clampToBand(
      { usdc: 0.5, eurc: 0.4, cirbtc: 0.1, usyc: 0 },
      goalBands.aggressive,
    );
    expect(out.cirbtc).toBe(0.3);
    expect(out.usdc + out.eurc + out.cirbtc + out.usyc).toBeCloseTo(1, SUMS_TO_ONE);
  });

  test("balanced honours all four floors", () => {
    const out = clampToBand(
      { usdc: 0.5, eurc: 0, cirbtc: 0.5, usyc: 0 },
      goalBands.balanced,
    );
    expect(out.eurc).toBeGreaterThanOrEqual(0.15 - 1e-9);
    expect(out.usyc).toBeGreaterThanOrEqual(0.15 - 1e-9);
    expect(out.usdc).toBeGreaterThanOrEqual(0.05 - 1e-9);
    expect(out.cirbtc).toBeLessThanOrEqual(0.45);
    expect(out.usdc + out.eurc + out.cirbtc + out.usyc).toBeCloseTo(1, SUMS_TO_ONE);
  });

  test("model returning all-zero collapses to band floors + cirbtc lower bound", () => {
    const out = clampToBand(
      { usdc: 0, eurc: 0, cirbtc: 0, usyc: 0 },
      goalBands.aggressive,
    );
    expect(out.cirbtc).toBeGreaterThanOrEqual(0.3 - 1e-9);
    expect(out.eurc).toBeGreaterThanOrEqual(0.05 - 1e-9);
    expect(out.usyc).toBeGreaterThanOrEqual(0.05 - 1e-9);
    expect(out.usdc).toBeGreaterThanOrEqual(0.05 - 1e-9);
    expect(out.usdc + out.eurc + out.cirbtc + out.usyc).toBeCloseTo(1, SUMS_TO_ONE);
  });

  test("over-eager eurc + usyc gets scaled to fit alongside high cirbtc", () => {
    // Aggressive: cirbtc cap 0.65. Model overflows with high eurc + usyc.
    const out = clampToBand(
      { usdc: 0, eurc: 0.5, cirbtc: 0.65, usyc: 0.3 },
      goalBands.aggressive,
    );
    expect(out.cirbtc).toBe(0.65);
    expect(out.usdc + out.eurc + out.cirbtc + out.usyc).toBeCloseTo(1, SUMS_TO_ONE);
  });

  test("under-allocated weights get slack parked in USDC", () => {
    const out = clampToBand(
      { usdc: 0, eurc: 0.2, cirbtc: 0.3, usyc: 0.2 },
      goalBands.balanced,
    );
    // Sum was 0.7 → USDC gets the 0.3 slack on top of its floor.
    expect(out.usdc).toBeGreaterThanOrEqual(0.3 - 1e-9);
    expect(out.usdc + out.eurc + out.cirbtc + out.usyc).toBeCloseTo(1, SUMS_TO_ONE);
  });
});

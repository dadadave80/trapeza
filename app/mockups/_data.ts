// Shared mock dashboard data for the design exploration mockups.
// All three /mockups/* variants render against the same data so they can
// be compared apples-to-apples.

export const MOCK = {
  user: {
    email: "alex@treasury.work",
    mandate: "Balanced",
  },
  portfolio: {
    totalUsd: 14_870.49,
    fetchedAt: "2026-05-24T18:42:17.000Z",
  },
  prices: {
    cirbtc: 76_662,
    eurc: 1.16,
    usyc: 1.02,
    source: "coingecko" as const,
  },
  positions: [
    {
      symbol: "USDC",
      hint: "cash · native gas",
      amount: 1_823.42,
      usd: 1_823.42,
      target: 0.10,
      actual: 0.123,
    },
    {
      symbol: "USYC",
      hint: "yield · ~10% APY",
      amount: 1_983.41,
      usd: 2_023.18,
      target: 0.15,
      actual: 0.136,
    },
    {
      symbol: "EURC",
      hint: "safe-FX",
      amount: 1_745.18,
      usd: 2_024.41,
      target: 0.18,
      actual: 0.136,
    },
    {
      symbol: "cirBTC",
      hint: "risk",
      amount: 0.118,
      usd: 9_046.12,
      target: 0.57,
      actual: 0.608,
    },
  ],
  address: "0xB3F2c4dD8B17aE6FB37Cf99A284fE9b5e1B62901" as `0x${string}`,
  latestDecision: {
    id: "d-9c2f4b1a",
    createdAt: "2026-05-24T18:30:11.000Z",
    regime: "risk_on" as const,
    confidence: 0.78,
    reasoning:
      "BTC ripped 4.2% over the last 24 hours with realised vol holding under 2%. With your Balanced bands, I'm pushing cirBTC to 57% (from 55%) and parking idle cash in USYC to earn the ~10% APY while we ride this. Gas reserve held at 10% USDC. No depeg signal on either stable. Holds unless vol jumps past 3% or BTC reverses below the day's open.",
    targetWeights: { usdc: 0.10, eurc: 0.18, cirbtc: 0.57, usyc: 0.15 },
    prevWeights: { usdc: 0.14, eurc: 0.16, cirbtc: 0.55, usyc: 0.15 },
    executed: true,
    arcTxHash: "0xab12c4d8e9f1a3b7c8d9e0f1a2b3c4d5e6f78901a2b3c4d5e6f7a8b9c0d1e2f3",
    traceHash: "0x9c2f4b1a8d6e3c5b7f9a2d4e6f8a1c3b5d7e9f2a4c6e8b1d3f5a7c9e0b2d4f6",
    circleTxId: "ct_8b7a6c5d4e3f2a1b",
  },
  history: [
    {
      id: "d-7a3b91c2",
      createdAt: "2026-05-24T17:00:00.000Z",
      regime: "neutral" as const,
      reasoning:
        "Mid-day chop on BTC; no regime shift candidate. Holding weights.",
      executed: false,
    },
    {
      id: "d-5c2e84d9",
      createdAt: "2026-05-24T14:45:00.000Z",
      regime: "risk_on" as const,
      reasoning:
        "BTC consolidating above 75k with vol cooling. Tilted cirBTC +3% within Balanced band.",
      executed: true,
    },
    {
      id: "d-3b1f72a6",
      createdAt: "2026-05-24T11:30:00.000Z",
      regime: "risk_off" as const,
      reasoning:
        "USDC briefly traded to $0.994 across two venues — depeg threshold hit. Rotated 8% of cirBTC into USDC + EURC until prices reset.",
      executed: true,
    },
    {
      id: "d-1a0c5e83",
      createdAt: "2026-05-24T08:15:00.000Z",
      regime: "neutral" as const,
      reasoning:
        "Asian session quiet, no signals warrant a move. Skipping the heavy decision.",
      executed: false,
    },
    {
      id: "d-9f8d4a72",
      createdAt: "2026-05-23T22:30:00.000Z",
      regime: "risk_on" as const,
      reasoning:
        "Overnight strength on majors. Initial deposit allocated to bands; cirBTC seeded at 62%.",
      executed: true,
    },
  ],
} as const;

export type MockData = typeof MOCK;

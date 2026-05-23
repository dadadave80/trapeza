// Chain + token addresses. Sourced from env at runtime so we can rotate
// without redeploying. Hard defaults match docs/circlefin-skills/use-arc.md.

function env(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

function optionalEnv(key: string): string | undefined {
  return process.env[key];
}

export const ARC = {
  rpcUrl: () => env("ARC_RPC_URL", "https://rpc.testnet.arc.network"),
  chainId: () => Number(env("ARC_CHAIN_ID", "5042002")),
  usdc: () => env("ARC_USDC_ADDRESS", "0x3600000000000000000000000000000000000000") as `0x${string}`,
  eurc: () => env("ARC_EURC_ADDRESS", "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a") as `0x${string}`,
  cirbtc: () => optionalEnv("ARC_CIRBTC_ADDRESS") as `0x${string}` | undefined,
  traceAnchor: () => env("TRACE_ANCHOR_ADDRESS") as `0x${string}`,
} as const;

// Circle SDK blockchain identifier. ARC-TESTNET per
// docs/circlefin-skills/use-smart-contract-platform.md "Supported Blockchains".
export const CIRCLE_ARC_BLOCKCHAIN =
  (process.env.CIRCLE_ARC_BLOCKCHAIN ?? "ARC-TESTNET") as "ARC-TESTNET";

// App Kit chain identifier (case-sensitive, per
// docs/docs.arc.network/app-kit/references/supported-blockchains.md).
export const APPKIT_ARC_CHAIN = "Arc_Testnet" as const;

// Stable token decimals (USDC, EURC: 6dp on Arc Testnet ERC-20).
export const USDC_DECIMALS = 6;
export const EURC_DECIMALS = 6;
// cirBTC decimals — verify against the resolved contract before first swap.
export const CIRBTC_DECIMALS = 8;

// Rebalance discipline: only execute swaps if any leg drifts by > this fraction.
export const REBALANCE_THRESHOLD = 0.05;

// Minimum seconds between agent runs per user (cron-side safety net).
export const MIN_INTERVAL_SECONDS = 10 * 60;

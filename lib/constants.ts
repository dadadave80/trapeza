// Chain + token addresses. Sourced from env at runtime so we can rotate
// without redeploying. Hard defaults match docs/circlefin-skills/use-arc.md.

function env(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

function optionalEnv(key: string): string | undefined {
  return process.env[key] || undefined;
}

// Non-throwing display constants — safe in client components, footers, etc.
// Use ARC.* getters when you actually need the runtime-validated values.
export const ARC_DISPLAY = {
  chainId: 5042002,
  chainIdHex: "0x4CEF52",
  name: "Arc Testnet",
  explorerUrl: "https://testnet.arcscan.app",
} as const;

// Defaults point at the hackathon mocks deployed via contracts/script/Deploy.s.sol
// (see contracts/deployments/5042002.json). The mocks expose an open `mint`
// so the in-app faucet works; real Circle-issued tokens on Arc Testnet do not.
// Override any of these via env to switch back to canonical addresses.
export const ARC = {
  rpcUrl: () => env("ARC_RPC_URL", "https://rpc.testnet.arc.network"),
  chainId: () => Number(env("ARC_CHAIN_ID", "5042002")),
  usdc: () => env("ARC_USDC_ADDRESS", "0xf8075E9DE8E8D27F98D5C78Be26CEbceEd6f9A79") as `0x${string}`,
  eurc: () => env("ARC_EURC_ADDRESS", "0x72cfA7f9DfA38975f4ed4AcF86f67D6E490a52d8") as `0x${string}`,
  cirbtc: () => env("ARC_CIRBTC_ADDRESS", "0x8cad4951192853D14f8Cb813695146b5Ae00EA6d") as `0x${string}`,
  usyc: () => env("ARC_USYC_ADDRESS", "0x1Fc2873AABE4700dD2753e43B9566B5A7BbA902C") as `0x${string}`,
  // When set, the agent routes swaps through MockSwap (one `Swapped` event
  // per leg, clean to index on arcscan). When explicitly cleared, the agent
  // falls back to transfer-to-sink + mint, which moves balances but emits
  // no rich swap event. Deploy via contracts/script/DeployMockSwap.s.sol.
  mockSwap: () =>
    (optionalEnv("ARC_MOCKSWAP_ADDRESS") ??
      "0xaf9879EDD99ce2F2Ea0CaFdF6Dd19da15B573a3f") as `0x${string}`,
  traceAnchor: () => env("TRACE_ANCHOR_ADDRESS") as `0x${string}`,
} as const;

// Circle SDK blockchain identifier. ARC-TESTNET per
// docs/circlefin-skills/use-smart-contract-platform.md "Supported Blockchains".
export const CIRCLE_ARC_BLOCKCHAIN =
  (process.env.CIRCLE_ARC_BLOCKCHAIN ?? "ARC-TESTNET") as "ARC-TESTNET";

// App Kit chain identifier (case-sensitive, per
// docs/docs.arc.network/app-kit/references/supported-blockchains.md).
export const APPKIT_ARC_CHAIN = "Arc_Testnet" as const;

// Token decimals. All four hackathon mocks use 6dp (deliberate — keeps the
// frontend's units math uniform). Production cirBTC is 8dp; if you swap back
// to canonical Arc tokens, bump CIRBTC_DECIMALS to 8.
export const USDC_DECIMALS = 6;
export const EURC_DECIMALS = 6;
export const CIRBTC_DECIMALS = 6;
export const USYC_DECIMALS = 6;

// Rebalance discipline: only execute swaps if any leg drifts by > this fraction.
export const REBALANCE_THRESHOLD = 0.05;

// Minimum seconds between agent runs per user (cron-side safety net).
export const MIN_INTERVAL_SECONDS = 10 * 60;

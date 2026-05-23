import { formatUnits } from "viem";
import { publicArc } from "./client";
import { erc20Abi } from "./abi/erc20";
import { ARC, USDC_DECIMALS, EURC_DECIMALS, CIRBTC_DECIMALS } from "@/lib/constants";

export type TokenBalances = {
  usdc: number;
  eurc: number;
  cirbtc: number;
  total: number;
  fetched_at: string;
};

// Reads USDC + EURC + cirBTC balances via three parallel eth_calls.
// Returns human-readable numbers (USD-denominated assuming USDC≈EURC≈$1 and
// cirBTC valuation is added by the caller; for Phase 2 we report raw token
// units and total in USD-equivalent assuming 1:1 stables).
export async function readBalances(address: `0x${string}`): Promise<TokenBalances> {
  const client = publicArc();
  const usdcAddr = ARC.usdc();
  const eurcAddr = ARC.eurc();
  const cirbtcAddr = ARC.cirbtc();

  const calls: Promise<bigint>[] = [
    client.readContract({
      address: usdcAddr,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    }),
    client.readContract({
      address: eurcAddr,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    }),
  ];
  if (cirbtcAddr) {
    calls.push(
      client.readContract({
        address: cirbtcAddr,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      }),
    );
  } else {
    calls.push(Promise.resolve(0n));
  }

  const [usdcRaw, eurcRaw, cirbtcRaw] = await Promise.all(calls);

  const usdc = Number(formatUnits(usdcRaw, USDC_DECIMALS));
  const eurc = Number(formatUnits(eurcRaw, EURC_DECIMALS));
  const cirbtc = Number(formatUnits(cirbtcRaw, CIRBTC_DECIMALS));

  // Naive USD-equivalent: USDC + EURC at $1, cirBTC priced separately by the
  // caller. Phase 2 just reports the per-token totals.
  const total = usdc + eurc + cirbtc;

  return {
    usdc,
    eurc,
    cirbtc,
    total,
    fetched_at: new Date().toISOString(),
  };
}

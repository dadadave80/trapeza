import { formatUnits } from "viem";
import { publicArc } from "./client";
import { erc20Abi } from "./abi/erc20";
import { ARC, USDC_DECIMALS, EURC_DECIMALS, CIRBTC_DECIMALS } from "@/lib/constants";
import { getPrices, type PriceSource } from "@/lib/agent/pricing";

export type TokenBalances = {
  // Raw token unit amounts (human-readable, e.g. 12.345 USDC, 0.001 cirBTC).
  usdc: number;
  eurc: number;
  cirbtc: number;
  // USD price per token unit (USDC=1, EURC=oracle, cirBTC=oracle).
  prices: { usdc: number; eurc: number; cirbtc: number };
  // USD value per token (= units × price).
  totals_usd: { usdc: number; eurc: number; cirbtc: number };
  // Total portfolio value in USD-equivalent. Weight math and rebalance
  // thresholds depend on this.
  total: number;
  // Price provenance — same source applies to both EURC and cirBTC since
  // they come from the same CoinGecko batch call.
  price_source: PriceSource;
  fetched_at: string;
};

// Read all three ERC-20 balances in parallel + EURC/cirBTC USD prices,
// multiply, return both unit amounts and USD totals. The agent's weight
// math uses `totals_usd`; the dashboard shows both for transparency.
export async function readBalances(address: `0x${string}`): Promise<TokenBalances> {
  const client = publicArc();
  const tokens = [
    { address: ARC.usdc(), abi: erc20Abi, functionName: "balanceOf", args: [address] } as const,
    { address: ARC.eurc(), abi: erc20Abi, functionName: "balanceOf", args: [address] } as const,
    { address: ARC.cirbtc(), abi: erc20Abi, functionName: "balanceOf", args: [address] } as const,
  ];

  // Balances + prices in parallel.
  const [[usdcRaw, eurcRaw, cirbtcRaw], priceRes] = await Promise.all([
    Promise.all(tokens.map((t) => client.readContract(t))),
    getPrices(),
  ]);

  const usdc = Number(formatUnits(usdcRaw, USDC_DECIMALS));
  const eurc = Number(formatUnits(eurcRaw, EURC_DECIMALS));
  const cirbtc = Number(formatUnits(cirbtcRaw, CIRBTC_DECIMALS));

  const prices = { usdc: 1, eurc: priceRes.eurc, cirbtc: priceRes.cirbtc };
  const totals_usd = {
    usdc: usdc * prices.usdc,
    eurc: eurc * prices.eurc,
    cirbtc: cirbtc * prices.cirbtc,
  };
  const total = totals_usd.usdc + totals_usd.eurc + totals_usd.cirbtc;

  return {
    usdc,
    eurc,
    cirbtc,
    prices,
    totals_usd,
    total,
    price_source: priceRes.source,
    fetched_at: new Date().toISOString(),
  };
}

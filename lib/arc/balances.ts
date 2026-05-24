import { formatUnits } from "viem";
import { publicArc } from "./client";
import { erc20Abi } from "./abi/erc20";
import { ARC, USDC_DECIMALS, EURC_DECIMALS, CIRBTC_DECIMALS } from "@/lib/constants";
import { getCirBtcUsdPrice } from "@/lib/agent/pricing";

export type TokenBalances = {
  // Raw token unit amounts (human-readable, e.g. 12.345 USDC, 0.001 cirBTC).
  usdc: number;
  eurc: number;
  cirbtc: number;
  // USD price per token unit (USDC=1, EURC=1 (hackathon-grade), cirBTC=oracle).
  prices: { usdc: number; eurc: number; cirbtc: number };
  // USD value per token (= units × price).
  totals_usd: { usdc: number; eurc: number; cirbtc: number };
  // Total portfolio value in USD-equivalent. This is what `total` means now —
  // weight math and rebalance thresholds depend on it.
  total: number;
  // Price source for the cirBTC leg (coingecko | cache | fallback).
  cirbtc_price_source: "coingecko" | "cache" | "fallback";
  fetched_at: string;
};

// Read all three ERC-20 balances in parallel, multiply by USD prices,
// and return both unit amounts and USD totals. The agent's weight math
// uses `totals_usd`; the dashboard shows both for transparency.
export async function readBalances(address: `0x${string}`): Promise<TokenBalances> {
  const client = publicArc();
  const usdcAddr = ARC.usdc();
  const eurcAddr = ARC.eurc();
  const cirbtcAddr = ARC.cirbtc();

  const balanceCalls: Promise<bigint>[] = [
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
    balanceCalls.push(
      client.readContract({
        address: cirbtcAddr,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      }),
    );
  } else {
    balanceCalls.push(Promise.resolve(0n));
  }

  // Balances + cirBTC price in parallel.
  const [[usdcRaw, eurcRaw, cirbtcRaw], cirBtcPriceRes] = await Promise.all([
    Promise.all(balanceCalls),
    getCirBtcUsdPrice(),
  ]);

  const usdc = Number(formatUnits(usdcRaw, USDC_DECIMALS));
  const eurc = Number(formatUnits(eurcRaw, EURC_DECIMALS));
  const cirbtc = Number(formatUnits(cirbtcRaw, CIRBTC_DECIMALS));

  const prices = { usdc: 1, eurc: 1, cirbtc: cirBtcPriceRes.usd };
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
    cirbtc_price_source: cirBtcPriceRes.source,
    fetched_at: new Date().toISOString(),
  };
}

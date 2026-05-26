import { formatUnits } from "viem";
import { publicArc } from "./client";
import { erc20Abi } from "./abi/erc20";
import { usycAbi } from "./abi/usyc";
import {
  ARC,
  USDC_DECIMALS,
  EURC_DECIMALS,
  CIRBTC_DECIMALS,
  USYC_DECIMALS,
} from "@/lib/constants";
import { getPrices, type PriceSource } from "@/lib/agent/pricing";

export type TokenBalances = {
  // Raw token unit amounts (human-readable).
  usdc: number;
  eurc: number;
  cirbtc: number;
  // For USYC, `usyc` is the share count; `usyc_assets_usdc` is the underlying
  // USDC the shares are currently worth (per the vault's totalAssets/supply).
  usyc: number;
  usyc_assets_usdc: number;
  // USD price per token unit. usyc.price is effectively the USDC value per
  // USYC share, holding USDC=$1.
  prices: { usdc: number; eurc: number; cirbtc: number; usyc: number };
  // USD value per token (= units × price).
  totals_usd: { usdc: number; eurc: number; cirbtc: number; usyc: number };
  total: number;
  // 24h portfolio P&L derived from CoinGecko's `usd_24h_change` on BTC + EUR.
  // We re-price the *current* basket at yesterday's prices — this captures
  // mark-to-market P&L (the only real P&L source in our mock economy, since
  // MockSwap converts at oracle rates with no slippage). USDC + USYC are
  // pinned at $1, so their contribution is always zero.
  total_24h_ago: number;
  delta_24h_usd: number;
  delta_24h_pct: number;
  // Price provenance — applies to EURC + cirBTC (CoinGecko batch).
  price_source: PriceSource;
  fetched_at: string;
};

// Read all four token balances in parallel + EURC/cirBTC USD prices + the
// USYC share price (from convertToShares/convertToAssets). Returns both raw
// units and USD totals; the agent uses `totals_usd` for weight math.
export async function readBalances(address: `0x${string}`): Promise<TokenBalances> {
  const client = publicArc();
  const usycAddr = ARC.usyc();

  const [usdcRaw, eurcRaw, cirbtcRaw, usycShares, usycShareToAssets, priceRes] =
    await Promise.all([
      client.readContract({
        address: ARC.usdc(),
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      }),
      client.readContract({
        address: ARC.eurc(),
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      }),
      client.readContract({
        address: ARC.cirbtc(),
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      }),
      client.readContract({
        address: usycAddr,
        abi: usycAbi,
        functionName: "balanceOf",
        args: [address],
      }),
      // Asset value of 1 whole share (1e6 raw). If totalSupply is 0 this still
      // returns >0 thanks to Solady's virtual-shares offset; we treat it as
      // the canonical share-to-asset rate either way.
      client.readContract({
        address: usycAddr,
        abi: usycAbi,
        functionName: "convertToAssets",
        args: [BigInt(10 ** USYC_DECIMALS)],
      }),
      getPrices(),
    ]);

  const usdc = Number(formatUnits(usdcRaw, USDC_DECIMALS));
  const eurc = Number(formatUnits(eurcRaw, EURC_DECIMALS));
  const cirbtc = Number(formatUnits(cirbtcRaw, CIRBTC_DECIMALS));
  const usyc = Number(formatUnits(usycShares, USYC_DECIMALS));

  // Share-to-USDC ratio. Both denominated in 6dp so the units cancel.
  const usycPricePerShare =
    Number(formatUnits(usycShareToAssets, USDC_DECIMALS));
  const usyc_assets_usdc = usyc * usycPricePerShare;

  const prices = {
    usdc: 1,
    eurc: priceRes.eurc,
    cirbtc: priceRes.cirbtc,
    // Holding USDC=$1, the USYC share is worth its USDC redemption value.
    usyc: usycPricePerShare,
  };
  const totals_usd = {
    usdc: usdc * prices.usdc,
    eurc: eurc * prices.eurc,
    cirbtc: cirbtc * prices.cirbtc,
    usyc: usyc * prices.usyc,
  };
  const total =
    totals_usd.usdc + totals_usd.eurc + totals_usd.cirbtc + totals_usd.usyc;

  // 24h-ago re-pricing: for risk legs, current_price / (1 + 24h_change_pct).
  // Stables stay at $1. Assumes basket hasn't changed in 24h, which is fine
  // for a mock economy where swaps cost no slippage.
  const cirbtcPrice24hAgo =
    priceRes.cirbtc / (1 + (priceRes.cirbtc_change_24h_pct ?? 0) / 100);
  const eurcPrice24hAgo =
    priceRes.eurc / (1 + (priceRes.eurc_change_24h_pct ?? 0) / 100);
  const total_24h_ago =
    usdc * 1 + // USDC pinned at $1
    eurc * eurcPrice24hAgo +
    cirbtc * cirbtcPrice24hAgo +
    usyc * usycPricePerShare; // USYC is also stable-pegged for our mock
  const delta_24h_usd = total - total_24h_ago;
  const delta_24h_pct = total_24h_ago > 0
    ? (delta_24h_usd / total_24h_ago) * 100
    : 0;

  return {
    usdc,
    eurc,
    cirbtc,
    usyc,
    usyc_assets_usdc,
    prices,
    totals_usd,
    total,
    total_24h_ago,
    delta_24h_usd,
    delta_24h_pct,
    price_source: priceRes.source,
    fetched_at: new Date().toISOString(),
  };
}

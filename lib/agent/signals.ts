import { signalsSchema, type Signals } from "@/lib/types";

// Pull BTC + ETH 24h % change and stablecoin spot prices from CoinGecko's
// free /simple/price endpoint. Realized vol is approximated as |btc_24h_change|
// for hackathon-grade simplicity — replace with hourly std-dev later.
//
// No API key required for /simple/price. Cache 5min to stay polite to the
// free tier and to keep the agent loop deterministic across the cron window.

const CACHE_TTL_MS = 5 * 60 * 1000;
let _cache: { at: number; value: Signals } | null = null;

const CG_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,usd-coin,tether&vs_currencies=usd&include_24hr_change=true";

type CGResponse = {
  bitcoin?: { usd: number; usd_24h_change?: number };
  ethereum?: { usd: number; usd_24h_change?: number };
  "usd-coin"?: { usd: number };
  tether?: { usd: number };
};

export async function fetchSignals(): Promise<Signals> {
  const now = Date.now();
  if (_cache && now - _cache.at < CACHE_TTL_MS) return _cache.value;

  const res = await fetch(CG_URL, {
    headers: { accept: "application/json" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as CGResponse;

  const btc_24h = data.bitcoin?.usd_24h_change ?? 0;
  const eth_24h = data.ethereum?.usd_24h_change ?? 0;

  const raw: Signals = {
    btc_24h_change: btc_24h,
    eth_24h_change: eth_24h,
    btc_realized_vol: Math.abs(btc_24h), // crude proxy; replace with hourly std-dev
    usdc_price: data["usd-coin"]?.usd ?? 1,
    usdt_price: data.tether?.usd ?? 1,
    fetched_at: new Date().toISOString(),
  };

  const parsed = signalsSchema.parse(raw);
  _cache = { at: now, value: parsed };
  return parsed;
}

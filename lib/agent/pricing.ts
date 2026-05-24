// cirBTC USD price oracle. cirBTC is BTC-pegged on Arc Testnet, so we use
// CoinGecko's BTC/USD spot as the source of truth. 5-min cache to stay
// polite to the free tier and keep balance reads cheap. Graceful fallback
// to a hardcoded value if CoinGecko is unreachable — we never want the
// dashboard to hard-fail just because a price feed flapped.

const CACHE_TTL_MS = 5 * 60 * 1000;
const FALLBACK_BTC_USD = 60_000; // sane recent floor; overridable via env

const URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";

type Cached = { at: number; usd: number; source: "coingecko" | "fallback" | "cache" };
let _cache: Cached | null = null;

export type PriceResult = {
  usd: number;
  source: "coingecko" | "fallback" | "cache";
  fetched_at: string;
};

export async function getCirBtcUsdPrice(): Promise<PriceResult> {
  const now = Date.now();
  if (_cache && now - _cache.at < CACHE_TTL_MS) {
    return {
      usd: _cache.usd,
      source: "cache",
      fetched_at: new Date(_cache.at).toISOString(),
    };
  }

  try {
    const res = await fetch(URL, {
      headers: { accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`CoinGecko ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { bitcoin?: { usd?: number } };
    const usd = data.bitcoin?.usd;
    if (typeof usd !== "number" || usd <= 0) {
      throw new Error("CoinGecko returned no BTC price");
    }
    _cache = { at: now, usd, source: "coingecko" };
    return { usd, source: "coingecko", fetched_at: new Date(now).toISOString() };
  } catch (err) {
    const fallback = Number(process.env.CIRBTC_USD_FALLBACK) || FALLBACK_BTC_USD;
    console.warn(
      `[pricing] CoinGecko BTC price failed (${err instanceof Error ? err.message : String(err)}); using fallback $${fallback}`,
    );
    // Cache the fallback for half the TTL so we re-attempt sooner.
    _cache = { at: now - CACHE_TTL_MS / 2, usd: fallback, source: "fallback" };
    return { usd: fallback, source: "fallback", fetched_at: new Date(now).toISOString() };
  }
}

// Pricing for the three tokens we hold. USDC is pegged $1; EURC tracks EUR
// (~$1.05-1.10 currently) but we treat it as $1 for hackathon-grade
// accuracy — the goal-band logic is far more important than ±5% on EURC.
// cirBTC is the only one that actually needs an oracle.
export async function priceUsd(
  token: "usdc" | "eurc" | "cirbtc",
): Promise<number> {
  if (token === "usdc") return 1;
  if (token === "eurc") return 1;
  const r = await getCirBtcUsdPrice();
  return r.usd;
}

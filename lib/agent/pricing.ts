// Price oracle for the two non-USDC legs:
//
// - cirBTC: BTC-pegged on Arc Testnet, priced via CoinGecko `bitcoin`.
// - EURC:   EUR-pegged, priced via CoinGecko `euro-coin`. Was previously
//           hardcoded to $1 which is ~7% off and big enough to push the
//           weight math outside the 5% rebalance threshold.
//
// Both prices are pulled in a single CoinGecko `/simple/price` call to halve
// the API surface and keep the cache coherent. 5-min cache; graceful
// fallback (sane recent values, overridable via env) if CoinGecko flaps.

const CACHE_TTL_MS = 5 * 60 * 1000;
const URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,euro-coin&vs_currencies=usd&include_24hr_change=true";

// Sane recent floors; override via env if you need different fallbacks.
const FALLBACK = {
  cirbtc: 60_000,
  eurc: 1.08,
  // 0% means "no information" — the dashboard treats missing 24h change as
  // a hidden pill, not a fake $0.00 delta.
  cirbtc_change_24h_pct: 0,
  eurc_change_24h_pct: 0,
};

export type PriceSource = "coingecko" | "cache" | "fallback";

export type AllPrices = {
  cirbtc: number;
  eurc: number;
  // 24h % change (e.g. 4.2 means up 4.2%). Used to derive a portfolio P&L
  // pill by re-pricing current holdings at yesterday's prices. Stablecoin
  // legs (USDC, USYC) are pinned at $1 with 0% change.
  cirbtc_change_24h_pct: number;
  eurc_change_24h_pct: number;
  source: PriceSource;
  fetched_at: string;
};

type CacheEntry = {
  at: number;
  cirbtc: number;
  eurc: number;
  cirbtc_change_24h_pct: number;
  eurc_change_24h_pct: number;
  source: "coingecko" | "fallback";
};

let _cache: CacheEntry | null = null;

export async function getPrices(): Promise<AllPrices> {
  const now = Date.now();
  if (_cache && now - _cache.at < CACHE_TTL_MS) {
    return {
      cirbtc: _cache.cirbtc,
      eurc: _cache.eurc,
      cirbtc_change_24h_pct: _cache.cirbtc_change_24h_pct,
      eurc_change_24h_pct: _cache.eurc_change_24h_pct,
      source: _cache.source === "coingecko" ? "cache" : "fallback",
      fetched_at: new Date(_cache.at).toISOString(),
    };
  }

  try {
    const res = await fetch(URL, {
      headers: { accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`CoinGecko ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      bitcoin?: { usd?: number; usd_24h_change?: number };
      "euro-coin"?: { usd?: number; usd_24h_change?: number };
    };
    const btc = data.bitcoin?.usd;
    const eur = data["euro-coin"]?.usd;
    if (typeof btc !== "number" || btc <= 0) {
      throw new Error("CoinGecko returned no BTC price");
    }
    if (typeof eur !== "number" || eur <= 0) {
      throw new Error("CoinGecko returned no EURC price");
    }
    const btcChange = Number(data.bitcoin?.usd_24h_change ?? 0);
    const eurChange = Number(data["euro-coin"]?.usd_24h_change ?? 0);
    _cache = {
      at: now,
      cirbtc: btc,
      eurc: eur,
      cirbtc_change_24h_pct: btcChange,
      eurc_change_24h_pct: eurChange,
      source: "coingecko",
    };
    return {
      cirbtc: btc,
      eurc: eur,
      cirbtc_change_24h_pct: btcChange,
      eurc_change_24h_pct: eurChange,
      source: "coingecko",
      fetched_at: new Date(now).toISOString(),
    };
  } catch (err) {
    const fallbackCirbtc = Number(process.env.CIRBTC_USD_FALLBACK) || FALLBACK.cirbtc;
    const fallbackEurc = Number(process.env.EURC_USD_FALLBACK) || FALLBACK.eurc;
    console.warn(
      `[pricing] CoinGecko fetch failed (${err instanceof Error ? err.message : String(err)}); using fallback cirBTC=$${fallbackCirbtc} EURC=$${fallbackEurc}`,
    );
    // Cache fallback for half the TTL so we retry sooner.
    _cache = {
      at: now - CACHE_TTL_MS / 2,
      cirbtc: fallbackCirbtc,
      eurc: fallbackEurc,
      cirbtc_change_24h_pct: FALLBACK.cirbtc_change_24h_pct,
      eurc_change_24h_pct: FALLBACK.eurc_change_24h_pct,
      source: "fallback",
    };
    return {
      cirbtc: fallbackCirbtc,
      eurc: fallbackEurc,
      cirbtc_change_24h_pct: FALLBACK.cirbtc_change_24h_pct,
      eurc_change_24h_pct: FALLBACK.eurc_change_24h_pct,
      source: "fallback",
      fetched_at: new Date(now).toISOString(),
    };
  }
}

// Backwards-compat shims for any standalone callers.
export type PriceResult = {
  usd: number;
  source: PriceSource;
  fetched_at: string;
};

export async function getCirBtcUsdPrice(): Promise<PriceResult> {
  const p = await getPrices();
  return { usd: p.cirbtc, source: p.source, fetched_at: p.fetched_at };
}

export async function getEurcUsdPrice(): Promise<PriceResult> {
  const p = await getPrices();
  return { usd: p.eurc, source: p.source, fetched_at: p.fetched_at };
}

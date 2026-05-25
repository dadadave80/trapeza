import Link from "next/link";
import { DashboardView } from "@/app/portfolio/dashboard-view";
import { MOCK } from "@/app/mockups/_data";
import type { TokenBalances } from "@/lib/arc/balances";

export const metadata = {
  title: "Trapeza · Demo · No sign-in required",
  description:
    "A read-only walkthrough of the Trapeza dashboard with mock portfolio data. Sign in at /onboard to mint your own Arc Testnet wallet.",
};

export default function DemoPage() {
  const balances: TokenBalances = {
    usdc: MOCK.positions[0].amount,
    usyc: MOCK.positions[1].amount,
    eurc: MOCK.positions[2].amount,
    cirbtc: MOCK.positions[3].amount,
    usyc_assets_usdc: MOCK.positions[1].usd,
    prices: {
      usdc: 1,
      usyc: MOCK.prices.usyc,
      eurc: MOCK.prices.eurc,
      cirbtc: MOCK.prices.cirbtc,
    },
    totals_usd: {
      usdc: MOCK.positions[0].usd,
      usyc: MOCK.positions[1].usd,
      eurc: MOCK.positions[2].usd,
      cirbtc: MOCK.positions[3].usd,
    },
    total: MOCK.portfolio.totalUsd,
    price_source: MOCK.prices.source,
    fetched_at: MOCK.portfolio.fetchedAt,
  };

  const decisions = [
    {
      id: MOCK.latestDecision.id,
      created_at: MOCK.latestDecision.createdAt,
      regime: MOCK.latestDecision.regime,
      target_weights: MOCK.latestDecision.targetWeights,
      prev_weights: MOCK.latestDecision.prevWeights,
      reasoning: MOCK.latestDecision.reasoning,
      alerts: [],
      trace_hash: MOCK.latestDecision.traceHash,
      arc_tx_hash: MOCK.latestDecision.arcTxHash,
      circle_tx_id: MOCK.latestDecision.circleTxId,
      executed: MOCK.latestDecision.executed,
    },
    ...MOCK.history.map((h) => ({
      id: h.id,
      created_at: h.createdAt,
      regime: h.regime,
      target_weights: { usdc: 0.15, eurc: 0.25, cirbtc: 0.45, usyc: 0.15 },
      prev_weights: null,
      reasoning: h.reasoning,
      alerts: [] as string[],
      trace_hash: null,
      arc_tx_hash: null,
      circle_tx_id: null,
      executed: h.executed,
    })),
  ];

  return (
    <DashboardView
      address={MOCK.address}
      goal="balanced"
      email={MOCK.user.email}
      balances={balances}
      decisions={decisions}
      lastCheckedAt={MOCK.portfolio.fetchedAt}
      loading={false}
      refreshing={false}
      running={false}
      initializing={false}
      loadingMore={false}
      hasMore={false}
      error={null}
      readOnly
      banner={<DemoBanner />}
    />
  );
}

function DemoBanner() {
  return (
    <div
      className="border-b-2 border-black"
      style={{ background: "#00FF66" }}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-3 flex flex-wrap items-baseline justify-between gap-3 label">
        <span>▍ Demo mode · mock portfolio · no wallet, no real funds</span>
        <Link
          href="/onboard"
          className="underline underline-offset-4 hover:no-underline whitespace-nowrap"
        >
          ▶ Mint a real Arc wallet
        </Link>
      </div>
    </div>
  );
}

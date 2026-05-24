"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { AllocationBar } from "@/components/allocation-bar";
import { RegimePill, RegimeLockup } from "@/components/regime-pill";
import { Masthead } from "@/components/masthead";
import { goalBands, type Goal, type TargetWeights } from "@/lib/types";
import type { TokenBalances } from "@/lib/arc/balances";

type Props = {
  address: `0x${string}`;
  goal: Goal;
  email: string | null;
};

type PortfolioResponse = {
  address: string;
  walletId: string | null;
  goal: Goal;
  balances: TokenBalances;
};

type DecisionRow = {
  id: string;
  created_at: string;
  regime: string;
  target_weights: TargetWeights;
  prev_weights: TargetWeights | null;
  reasoning: string;
  alerts: string[];
  trace_hash: string | null;
  arc_tx_hash: string | null;
  circle_tx_id: string | null;
  executed: boolean;
};

export function Dashboard({ address, goal, email }: Props) {
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([
        fetch("/api/portfolio", { cache: "no-store" }),
        fetch("/api/trace", { cache: "no-store" }),
      ]);
      if (!p.ok) {
        const body = await p.json().catch(() => null);
        throw new Error(body?.details || body?.error || `HTTP ${p.status}`);
      }
      const json = (await p.json()) as PortfolioResponse;
      setData(json);
      if (t.ok) {
        const tj = (await t.json()) as { decisions: DecisionRow[] };
        setDecisions(tj.decisions ?? []);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, [refresh]);

  async function runAgent() {
    setRunning(true);
    try {
      const res = await fetch("/api/agent/trigger", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.details || body?.error || `HTTP ${res.status}`);
      } else if (body?.result?.skipped) {
        toast.message(`Agent · ${body.result.skipped}`);
      } else {
        toast.success("Agent ran. Refreshing…");
      }
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  const band = goalBands[goal];
  const balances = data?.balances;
  const latest = decisions[0];

  const currentWeights: TargetWeights =
    balances && balances.total > 0
      ? {
          usdc: balances.totals_usd.usdc / balances.total,
          eurc: balances.totals_usd.eurc / balances.total,
          cirbtc: balances.totals_usd.cirbtc / balances.total,
        }
      : { usdc: 1, eurc: 0, cirbtc: 0 };

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied");
    } catch {
      toast.error("Couldn't copy — long-press the address field instead.");
    }
  }

  const decisionNum = decisions.length;

  return (
    <div className="flex-1">
      <Masthead
        right={
          <span className="kicker hidden lg:inline">
            {email ?? "signed in"} · {band.label}
          </span>
        }
      />

      <main className="mx-auto max-w-[1080px] px-6 sm:px-10 py-10 sm:py-14 space-y-14">
        {/* ─── HERO ──────────────────────────────────────────────────── */}
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 mb-8">
            <span className="kicker">
              Issue №{String(decisionNum).padStart(3, "0")} · {band.label} mandate
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
                {loading ? "Refreshing…" : "Refresh"}
              </Button>
              <Button size="sm" onClick={runAgent} disabled={running}>
                {running ? "Running…" : "Run agent now"}
              </Button>
            </div>
          </div>

          <h1
            className="display text-[44px] sm:text-[64px] lg:text-[76px] text-[color:var(--ink)] dark:text-[color:var(--ivory)]"
            style={{ fontVariationSettings: '"opsz" 84' }}
          >
            Your portfolio is reading{" "}
            <span className="display-italic text-[color:var(--ink-soft)] dark:text-[color:var(--taupe)]">
              the market as
            </span>{" "}
            <RegimeLockup
              regime={latest?.regime ?? "neutral"}
              confidence={undefined}
            />
            .
          </h1>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr] items-end">
            <div>
              <div className="kicker mb-2">Total value</div>
              <div
                className="display text-[56px] sm:text-[72px] text-[color:var(--ink)] dark:text-[color:var(--ivory)] leading-none"
                style={{ fontVariationSettings: '"opsz" 96' }}
              >
                {balances
                  ? `$${balances.total.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "—"}
              </div>
              {balances ? (
                <div className="ledger text-xs text-[color:var(--taupe)] mt-3 tabular-nums">
                  cirBTC ${" "}
                  {balances.prices.cirbtc.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                  {"  ·  "}
                  EURC ${balances.prices.eurc.toFixed(3)}
                  {"  ·  "}
                  source {balances.price_source}
                </div>
              ) : null}
            </div>

            <div className="lg:pl-10 lg:border-l lg:border-[color:var(--stone)]">
              <div className="kicker mb-3">Allocation</div>
              <AllocationBar
                actual={currentWeights}
                target={latest?.target_weights}
              />
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* ─── LEADER ARTICLE ────────────────────────────────────────── */}
        <section>
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
            <div className="space-y-2">
              <p className="kicker-oxblood">The latest decision</p>
              <p className="kicker text-[color:var(--taupe)]">
                {latest
                  ? new Date(latest.created_at).toLocaleString(undefined, {
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </p>
              {latest ? (
                <div className="pt-3 flex flex-col items-start gap-2">
                  <RegimePill regime={latest.regime} size="md" />
                  <span
                    className={`inline-flex items-center text-[11px] tracking-[0.18em] uppercase ${
                      latest.executed
                        ? "text-[color:var(--sage)]"
                        : "text-[color:var(--taupe)]"
                    }`}
                  >
                    {latest.executed ? "● Executed" : "○ Plan only"}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="space-y-6">
              {latest ? (
                <>
                  <blockquote
                    className="lede text-[22px] sm:text-[26px] text-[color:var(--ink)] dark:text-[color:var(--ivory)] relative pl-0"
                  >
                    <span
                      className="absolute -left-3 -top-1 text-[color:var(--oxblood)] display-italic"
                      aria-hidden
                      style={{ fontSize: "1em" }}
                    >
                      “
                    </span>
                    {latest.reasoning}
                  </blockquote>

                  {latest.alerts?.length ? (
                    <ul className="space-y-1 text-sm border-l-2 border-[color:var(--oxblood)] pl-3">
                      {latest.alerts.map((a, i) => (
                        <li key={i} className="text-[color:var(--oxblood)]">
                          ⚠︎ {a}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    {latest.arc_tx_hash ? (
                      <a
                        href={`https://testnet.arcscan.app/tx/${latest.arc_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="kicker-ink underline underline-offset-4 decoration-[color:var(--stone)] hover:decoration-[color:var(--ink)]"
                      >
                        Swap tx ↗
                      </a>
                    ) : null}
                    {latest.trace_hash ? (
                      <span
                        className="ledger text-[color:var(--taupe)] tracking-tight"
                        title={latest.trace_hash}
                      >
                        anchored {latest.trace_hash.slice(0, 10)}…{latest.trace_hash.slice(-6)}
                      </span>
                    ) : null}
                    <Link
                      href={`/trace/${latest.id}`}
                      className="ml-auto kicker-ink underline underline-offset-4 decoration-[color:var(--stone)] hover:decoration-[color:var(--ink)]"
                    >
                      Read the full decision →
                    </Link>
                  </div>
                </>
              ) : (
                <p className="lede text-[20px] text-[color:var(--taupe)]">
                  No decisions on record yet. Fund your wallet and press{" "}
                  <em>Run agent now</em> — Gemini will read the market, decide
                  weights inside your bands, swap onchain, and pin the trace
                  hash to Arc.
                </p>
              )}
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* ─── POSITIONS + DEPOSIT (classifieds layout) ──────────────── */}
        <section className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="kicker-ink">Positions</h2>
              {error ? (
                <span className="text-xs text-[color:var(--oxblood)]">{error}</span>
              ) : balances ? (
                <span className="ledger text-[11px] text-[color:var(--taupe)]">
                  fetched {new Date(balances.fetched_at).toLocaleTimeString()}
                </span>
              ) : null}
            </div>
            <div className="border-t border-[color:var(--stone)]">
              <PositionRow
                symbol="USDC"
                hint="cash · native gas"
                amount={balances?.usdc}
                usd={balances?.totals_usd.usdc}
                target={latest?.target_weights.usdc}
                loading={loading && !balances}
              />
              <PositionRow
                symbol="EURC"
                hint="safe-FX"
                amount={balances?.eurc}
                usd={balances?.totals_usd.eurc}
                target={latest?.target_weights.eurc}
                loading={loading && !balances}
              />
              <PositionRow
                symbol="cirBTC"
                hint="risk"
                amount={balances?.cirbtc}
                usd={balances?.totals_usd.cirbtc}
                target={latest?.target_weights.cirbtc}
                loading={loading && !balances}
              />
            </div>
          </div>

          <aside className="lg:pl-10 lg:border-l lg:border-[color:var(--stone)] space-y-6">
            <div>
              <h2 className="kicker-ink mb-2">Deposit</h2>
              <p className="text-sm text-[color:var(--taupe)] leading-relaxed">
                Send testnet USDC, EURC, or cirBTC to this address. Get
                testnet USDC from{" "}
                <a
                  href="https://faucet.circle.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 decoration-[color:var(--stone)] hover:decoration-[color:var(--ink)]"
                >
                  faucet.circle.com
                </a>
                . On Arc, USDC is the native gas token.
              </p>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-[3px] bg-[color:var(--ivory)] p-2 border border-[color:var(--stone)]">
                <QRCodeSVG value={address} size={108} marginSize={0} fgColor="#231914" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="kicker">Arc address</div>
                <code className="ledger block text-[12px] break-all bg-[color:var(--ivory-2)] px-2 py-1.5 rounded-[3px] border border-[color:var(--stone-soft)] text-[color:var(--ink)] dark:text-[color:var(--ivory)]">
                  {address}
                </code>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" onClick={copyAddress}>
                    Copy
                  </Button>
                  <a
                    href={`https://testnet.arcscan.app/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    Explorer ↗
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {decisions.length > 1 ? (
          <>
            <hr className="rule" />
            <section>
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="kicker-ink">History</h2>
                <span className="kicker">
                  Last {Math.min(10, decisions.length - 1)} decisions
                </span>
              </div>
              <div className="border-t border-[color:var(--stone)]">
                {decisions.slice(1, 11).map((d) => (
                  <Link
                    key={d.id}
                    href={`/trace/${d.id}`}
                    className="grid grid-cols-[auto_auto_1fr_auto] gap-x-4 items-center py-3.5 border-b border-[color:var(--stone-soft)] hover:bg-[color:var(--ivory-2)]/60 px-2 -mx-2 transition-colors group"
                  >
                    <span className="ledger text-[11px] text-[color:var(--taupe)] tabular-nums whitespace-nowrap">
                      {new Date(d.created_at)
                        .toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                        .replace(",", "")}
                    </span>
                    <RegimePill regime={d.regime} size="sm" />
                    <span
                      className="lede text-[15px] text-[color:var(--ink)] dark:text-[color:var(--ivory)] line-clamp-1"
                      style={{ fontVariationSettings: '"opsz" 18' }}
                    >
                      {d.reasoning}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-[0.18em] ${
                        d.executed
                          ? "text-[color:var(--sage)]"
                          : "text-[color:var(--taupe)]"
                      } group-hover:translate-x-0.5 transition-transform`}
                    >
                      {d.executed ? "exec." : "plan"} →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </>
        ) : null}

        <footer className="pt-8 pb-2 flex flex-wrap gap-3 items-baseline justify-between text-xs text-[color:var(--taupe)]">
          <span className="kicker">Trapeza · Arc Testnet · chainId 5042002</span>
          <span className="kicker">
            Cron runs every 15 min · GitHub Actions
          </span>
        </footer>
      </main>
    </div>
  );
}

function PositionRow({
  symbol,
  hint,
  amount,
  usd,
  target,
  loading,
}: {
  symbol: string;
  hint: string;
  amount: number | undefined;
  usd: number | undefined;
  target?: number;
  loading: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-8 py-4 border-b border-[color:var(--stone-soft)]">
      <div>
        <div
          className="display text-[22px] text-[color:var(--ink)] dark:text-[color:var(--ivory)]"
          style={{ fontVariationSettings: '"opsz" 24' }}
        >
          {symbol}
        </div>
        <div className="kicker mt-0.5">
          {hint}
          {target !== undefined ? `  ·  target ${(target * 100).toFixed(0)}%` : ""}
        </div>
      </div>
      <div className="ledger text-right text-sm tabular-nums text-[color:var(--ink-soft)]">
        {loading
          ? "…"
          : amount !== undefined
            ? amount.toLocaleString(undefined, { maximumFractionDigits: 6 })
            : "—"}
      </div>
      <div className="ledger text-right text-base tabular-nums text-[color:var(--ink)] dark:text-[color:var(--ivory)] min-w-[88px]">
        {loading
          ? "…"
          : usd !== undefined
            ? `$${usd.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            : "—"}
      </div>
    </div>
  );
}

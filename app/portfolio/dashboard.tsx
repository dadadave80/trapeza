"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
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
        toast.success("Agent ran");
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

  return (
    <div className="flex-1">
      <Masthead
        right={
          <>
            <span className="hidden md:inline opacity-60">{email}</span>
            <span className="border-l border-black pl-4 hidden md:inline">
              Mandate / {band.label}
            </span>
            <span className="border-l border-black pl-4 hidden lg:inline">
              Arc Testnet ▶ 5042002
            </span>
          </>
        }
      />

      {/* ─── HERO ───────────────────────────────────────────────────── */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 lg:col-span-8 border-r border-black py-10 lg:pr-6">
            <div className="label mb-3">01 / Portfolio</div>
            {balances ? (
              <div
                className="font-bold tabular-nums leading-[0.9] tracking-[-0.04em]"
                style={{ fontSize: "clamp(64px, 14vw, 168px)" }}
              >
                ${balances.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            ) : (
              <div
                className="font-bold tabular-nums leading-[0.9] tracking-[-0.04em] opacity-30"
                style={{ fontSize: "clamp(64px, 14vw, 168px)" }}
              >
                $—
              </div>
            )}
            <div className="grid grid-cols-3 gap-x-4 mt-6 pt-4 border-t border-black">
              <Datum
                label="cirBTC oracle"
                value={balances ? `$${balances.prices.cirbtc.toLocaleString()}` : "—"}
              />
              <Datum
                label="EURC oracle"
                value={balances ? `$${balances.prices.eurc.toFixed(3)}` : "—"}
              />
              <Datum
                label="Source"
                value={balances ? balances.price_source.toUpperCase() : "—"}
              />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 py-10 lg:pl-6 flex flex-col justify-between gap-6">
            <div>
              <div className="label mb-3">02 / Regime</div>
              <RegimeLockup
                regime={latest?.regime ?? "neutral"}
                confidence={undefined}
              />
              <div className="label mt-3">
                {latest
                  ? new Date(latest.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "No agent run yet"}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={refresh} disabled={loading} className="btn flex-1">
                {loading ? "▢ Refreshing" : "▢ Refresh"}
              </button>
              <button onClick={runAgent} disabled={running} className="btn-acid flex-1">
                {running ? "▶ Running" : "▶ Run agent now"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ALLOCATION ─────────────────────────────────────────────── */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 py-10">
          <div className="label mb-6">03 / Allocation · current vs target</div>
          <AllocationBar actual={currentWeights} target={latest?.target_weights} />
        </div>
      </section>

      {/* ─── REASONING ──────────────────────────────────────────────── */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 lg:col-span-3 border-r border-black py-10 lg:pr-6">
            <div className="label mb-4">04 / Decision</div>
            {latest ? (
              <>
                <div className="label space-y-1">
                  <div>{new Date(latest.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                  <div>{new Date(latest.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div className="mt-6 flex flex-col gap-2">
                  <RegimePill regime={latest.regime} size="md" />
                  <span
                    className={`inline-block w-fit border-2 border-black px-2 py-1 label`}
                    style={{ background: latest.executed ? "#00FF66" : "#FFFFFF" }}
                  >
                    {latest.executed ? "▍ Executed" : "○ Plan only"}
                  </span>
                </div>
              </>
            ) : (
              <div className="label opacity-60">No decisions yet</div>
            )}
          </div>
          <div className="col-span-12 lg:col-span-9 py-10 lg:pl-6 space-y-6">
            {latest ? (
              <>
                <p className="text-[22px] sm:text-[28px] leading-[1.25] font-medium tracking-tight">
                  &ldquo;{latest.reasoning}&rdquo;
                </p>

                {latest.alerts?.length ? (
                  <ul className="border-l-2 border-[color:var(--red)] pl-4 space-y-1">
                    {latest.alerts.map((a, i) => (
                      <li key={i} className="text-sm" style={{ color: "var(--red)" }}>
                        ⚠︎ {a}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="pt-4 border-t border-black grid sm:grid-cols-3 gap-x-4 gap-y-2 label">
                  {latest.arc_tx_hash ? (
                    <a
                      href={`https://testnet.arcscan.app/tx/${latest.arc_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      ▶ Swap tx · arcscan
                    </a>
                  ) : <span />}
                  {latest.trace_hash ? (
                    <span className="ledger normal-case tracking-tight text-[10px]" title={latest.trace_hash}>
                      sha256 {latest.trace_hash.slice(0, 8)}…{latest.trace_hash.slice(-4)}
                    </span>
                  ) : <span />}
                  <Link href={`/trace/${latest.id}`} className="hover:underline sm:text-right">
                    ▶ Full decision detail
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-[22px] sm:text-[28px] leading-[1.25] font-medium tracking-tight opacity-60">
                No decisions on record yet. Fund the wallet below and hit
                <span className="px-2 mx-2 border-2 border-black inline-block label" style={{ background: "#00FF66" }}>
                  ▶ Run agent now
                </span>
                — the agent reads the market, decides weights inside your bands,
                executes the rebalance onchain, and pins the trace.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ─── POSITIONS ──────────────────────────────────────────────── */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 py-10">
          <div className="flex items-baseline justify-between mb-6">
            <div className="label">05 / Positions</div>
            {error ? (
              <div className="label" style={{ color: "var(--red)" }}>
                Error: {error}
              </div>
            ) : balances ? (
              <div className="label opacity-60">
                Fetched {new Date(balances.fetched_at).toLocaleTimeString()}
              </div>
            ) : null}
          </div>
          <div className="border-2 border-black">
            <div className="grid grid-cols-[1fr_120px_120px_80px] label bg-black text-white">
              <div className="px-4 py-2.5">Symbol</div>
              <div className="px-4 py-2.5 border-l border-white/20 text-right">Units</div>
              <div className="px-4 py-2.5 border-l border-white/20 text-right">USD value</div>
              <div className="px-4 py-2.5 border-l border-white/20 text-right">Target</div>
            </div>
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
              last
            />
          </div>
        </div>
      </section>

      {/* ─── DEPOSIT ────────────────────────────────────────────────── */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 lg:col-span-4 border-r border-black py-10 lg:pr-6">
            <div className="label mb-4">06 / Deposit</div>
            <div className="border-2 border-black p-3 bg-white inline-block">
              <QRCodeSVG value={address} size={150} marginSize={0} fgColor="#000000" />
            </div>
          </div>
          <div className="col-span-12 lg:col-span-8 py-10 lg:pl-6 space-y-4">
            <div className="label">Arc Testnet address</div>
            <code className="block font-mono text-base sm:text-lg break-all border-2 border-black p-4 leading-tight">
              {address}
            </code>
            <div className="grid sm:grid-cols-3 gap-3">
              <button onClick={copyAddress} className="btn">
                ▶ Copy address
              </button>
              <a
                href={`https://testnet.arcscan.app/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn text-center"
              >
                ▶ View on arcscan
              </a>
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-acid text-center"
              >
                ▶ Faucet.circle.com
              </a>
            </div>
            <p className="text-sm opacity-70 leading-relaxed pt-2">
              Send testnet USDC, EURC, or cirBTC. On Arc, USDC is the native gas
              token — no ETH required for any transaction.
            </p>
          </div>
        </div>
      </section>

      {/* ─── HISTORY ────────────────────────────────────────────────── */}
      {decisions.length > 1 ? (
        <section className="border-b-2 border-black">
          <div className="mx-auto max-w-[1280px] px-6 py-10">
            <div className="flex items-baseline justify-between mb-6">
              <div className="label">07 / History · last {Math.min(10, decisions.length - 1)} decisions</div>
              <div className="label opacity-60">click any row →</div>
            </div>
            <div className="border-2 border-black">
              <div className="grid grid-cols-[130px_110px_1fr_80px] label bg-black text-white">
                <div className="px-4 py-2.5">When</div>
                <div className="px-4 py-2.5 border-l border-white/20">Regime</div>
                <div className="px-4 py-2.5 border-l border-white/20">Note</div>
                <div className="px-4 py-2.5 border-l border-white/20 text-right">State</div>
              </div>
              {decisions.slice(1, 11).map((d, i, arr) => (
                <Link
                  key={d.id}
                  href={`/trace/${d.id}`}
                  className={`grid grid-cols-[130px_110px_1fr_80px] items-center hover:bg-[#fff6a3] transition-colors ${
                    i < arr.length - 1 ? "border-b border-black" : ""
                  }`}
                >
                  <div className="px-4 py-3 label ledger whitespace-nowrap">
                    {new Date(d.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="px-4 py-3 border-l border-black">
                    <RegimePill regime={d.regime} size="sm" />
                  </div>
                  <div className="px-4 py-3 text-sm border-l border-black truncate">
                    {d.reasoning}
                  </div>
                  <div className="px-4 py-3 label text-right border-l border-black">
                    {d.executed ? "▍ Exec" : "○ Plan"}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ─── FOOTER ─────────────────────────────────────────────────── */}
      <footer>
        <div className="mx-auto max-w-[1280px] px-6 py-4 flex flex-wrap items-baseline justify-between gap-3 label">
          <span>Trapeza ▍ Treasury OS ▍ Arc Testnet · chainId 5042002</span>
          <span className="opacity-60">Cron · every 15 min · GitHub Actions</span>
        </div>
      </footer>
    </div>
  );
}

function Datum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <div className="text-lg font-bold tabular-nums ledger">{value}</div>
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
  last,
}: {
  symbol: string;
  hint: string;
  amount: number | undefined;
  usd: number | undefined;
  target?: number;
  loading: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_120px_120px_80px] items-center ${
        !last ? "border-b border-black" : ""
      }`}
    >
      <div className="px-4 py-4">
        <div className="text-lg font-bold tracking-tight">{symbol}</div>
        <div className="label-sm text-[color:var(--muted)]">{hint}</div>
      </div>
      <div className="px-4 py-4 border-l border-black text-right ledger text-sm tabular-nums">
        {loading
          ? "…"
          : amount !== undefined
            ? amount.toLocaleString(undefined, { maximumFractionDigits: 6 })
            : "—"}
      </div>
      <div className="px-4 py-4 border-l border-black text-right text-base font-bold tabular-nums">
        {loading
          ? "…"
          : usd !== undefined
            ? `$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "—"}
      </div>
      <div className="px-4 py-4 border-l border-black text-right ledger label tabular-nums">
        {target !== undefined ? `${(target * 100).toFixed(0)}%` : "—"}
      </div>
    </div>
  );
}

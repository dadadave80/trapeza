"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { AllocationBar } from "@/components/allocation-bar";
import { RegimePill, RegimeLockup } from "@/components/regime-pill";
import { Masthead } from "@/components/masthead";
import { goalBands, type Goal, type TargetWeights } from "@/lib/types";
import type { TokenBalances } from "@/lib/arc/balances";
import { ARC_DISPLAY } from "@/lib/constants";

// Presentational dashboard. Takes all state as props and bubbles all
// actions up via callbacks. /portfolio wraps this with live data + fetches;
// /demo wraps it with mock data + a banner so judges can browse without
// signing in.

export type DecisionRow = {
  id: string;
  created_at: string;
  regime: string;
  target_weights: TargetWeights;
  prev_weights: TargetWeights | null;
  reasoning: string;
  alerts: string[];
  trace_hash: string | null;
  arc_tx_hash: string | null;
  arc_tx_hashes?: string[];
  circle_tx_id: string | null;
  partial?: boolean;
  executed: boolean;
};

export type DashboardViewProps = {
  address: `0x${string}`;
  goal: Goal;
  email: string | null;
  balances: TokenBalances | null;
  decisions: DecisionRow[];
  lastCheckedAt: string | null;
  loading: boolean;
  refreshing: boolean;
  running: boolean;
  initializing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  // Actions — all optional so /demo can no-op them
  onRefresh?: () => void;
  onRunAgent?: () => void;
  onInitializeBands?: () => void;
  onLoadMore?: () => void;
  onCopyAddress?: () => void;
  onMintToken?: (token: "usdc" | "eurc" | "cirbtc") => void;
  minting?: "usdc" | "eurc" | "cirbtc" | null;
  // Suppresses the entire mandate switcher + sign-out (demo mode)
  readOnly?: boolean;
  // Optional banner above the masthead — used for demo/preview overlays
  banner?: React.ReactNode;
};

export function DashboardView({
  address,
  goal,
  email,
  balances,
  decisions,
  lastCheckedAt,
  loading,
  refreshing,
  running,
  initializing,
  loadingMore,
  hasMore,
  error,
  onRefresh,
  onRunAgent,
  onInitializeBands,
  onLoadMore,
  onCopyAddress,
  onMintToken,
  minting,
  readOnly,
  banner,
}: DashboardViewProps) {
  const band = goalBands[goal];
  const latest = decisions[0];

  const currentWeights: TargetWeights =
    balances && balances.total > 0
      ? {
          usdc: balances.totals_usd.usdc / balances.total,
          eurc: balances.totals_usd.eurc / balances.total,
          cirbtc: balances.totals_usd.cirbtc / balances.total,
          usyc: balances.totals_usd.usyc / balances.total,
        }
      : { usdc: 1, eurc: 0, cirbtc: 0, usyc: 0 };

  // Empty wallet → show the "Initialize bands" affordance after fund.
  // Trigger when the user has USDC but at least one of the non-cash legs
  // is flat (EURC, cirBTC, or USYC).
  const isFundedButFlat =
    balances !== null &&
    balances.total > 0.5 &&
    balances.usdc > 0.5 &&
    (balances.eurc < 0.001 ||
      balances.cirbtc < 0.000001 ||
      balances.usyc < 0.001) &&
    !latest;

  return (
    <div className="flex-1">
      {banner}

      <Masthead
        email={email}
        mandate={readOnly ? undefined : goal}
        right={
          <span className="opacity-60 whitespace-nowrap">
            Arc · {ARC_DISPLAY.chainId}
          </span>
        }
        signOut={!readOnly}
      />

      {/* ─── HERO ───────────────────────────────────────────────────── */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 lg:col-span-8 lg:border-r lg:border-black py-10 lg:pr-6">
            <div className="label mb-3 flex items-center justify-between gap-3 flex-wrap">
              <span>01 / Portfolio</span>
              <span className="opacity-60 normal-case">{band.label} mandate</span>
            </div>
            {loading ? (
              <Skeleton heightClass="h-[88px] sm:h-[112px] lg:h-[140px]" />
            ) : balances ? (
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 max-w-full">
                <div
                  className="font-bold tabular-nums leading-[0.9] tracking-[-0.04em] min-w-0"
                  style={{ fontSize: "clamp(44px, 10vw, 112px)" }}
                >
                  ${balances.total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <PnlPill
                  deltaUsd={balances.delta_24h_usd}
                  deltaPct={balances.delta_24h_pct}
                />
              </div>
            ) : (
              <div
                className="font-bold tabular-nums leading-[0.9] tracking-[-0.04em] opacity-30"
                style={{ fontSize: "clamp(44px, 10vw, 112px)" }}
              >
                $—
              </div>
            )}
            <div className="grid grid-cols-3 gap-x-4 mt-6 pt-4 border-t border-black">
              <Datum
                label="cirBTC oracle"
                value={balances ? `$${balances.prices.cirbtc.toLocaleString()}` : "—"}
                loading={loading}
              />
              <Datum
                label="EURC oracle"
                value={balances ? `$${balances.prices.eurc.toFixed(3)}` : "—"}
                loading={loading}
              />
              <Datum
                label="Source"
                value={balances ? balances.price_source.toUpperCase() : "—"}
                loading={loading}
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
                {latest ? (
                  <>Last decision · {timeAgo(latest.created_at)}</>
                ) : lastCheckedAt ? (
                  <>Agent woke up · {timeAgo(lastCheckedAt)}</>
                ) : (
                  <>No agent run yet</>
                )}
              </div>
            </div>
            {readOnly ? null : (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="btn flex-1"
                >
                  {refreshing ? "▢ Refreshing" : "▢ Refresh"}
                </button>
                <button
                  onClick={onRunAgent}
                  disabled={running || initializing}
                  className="btn-acid flex-1"
                >
                  {running ? "▶ Running" : "▶ Run agent now"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── ALLOCATION ─────────────────────────────────────────────── */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 py-10">
          <div className="label mb-6">03 / Allocation · current vs target</div>
          {loading ? (
            <Skeleton heightClass="h-32" />
          ) : (
            <AllocationBar actual={currentWeights} target={latest?.target_weights} />
          )}
        </div>
      </section>

      {/* ─── INITIALIZE BANDS callout (only when funded-but-flat) ──── */}
      {isFundedButFlat && !readOnly ? (
        <section className="border-b-2 border-black" style={{ background: "#FFEE00" }}>
          <div className="mx-auto max-w-[1280px] px-6 py-6 grid grid-cols-12 gap-x-4 items-center">
            <div className="col-span-12 lg:col-span-9">
              <div className="label mb-2">▍ One-time setup</div>
              <p className="text-base font-medium leading-relaxed">
                You&apos;ve funded USDC but the agent can&apos;t rebalance into EURC or
                cirBTC until your wallet holds some of each. Click to seed the
                mid-band weights for{" "}
                <span className="font-bold">{band.label}</span>.
              </p>
            </div>
            <div className="col-span-12 lg:col-span-3 mt-3 lg:mt-0 flex justify-end">
              <button
                onClick={onInitializeBands}
                disabled={initializing || running}
                className="btn-inverse w-full lg:w-auto"
              >
                {initializing ? "▶ Seeding…" : "▶ Initialize bands"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* ─── REASONING ──────────────────────────────────────────────── */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 lg:col-span-3 lg:border-r lg:border-black py-10 lg:pr-6">
            <div className="label mb-4">04 / Decision</div>
            {latest ? (
              <>
                <div className="label space-y-1">
                  <div>{new Date(latest.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                  <div>{new Date(latest.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div className="mt-6 flex flex-col gap-2">
                  <RegimePill regime={latest.regime} size="md" />
                  <ExecutedBadge executed={latest.executed} partial={latest.partial ?? false} />
                </div>
              </>
            ) : (
              <div className="label opacity-60">No decisions yet</div>
            )}
          </div>
          <div className="col-span-12 lg:col-span-9 py-10 lg:pl-6 space-y-6">
            {loading && !latest ? (
              <Skeleton heightClass="h-32" />
            ) : latest ? (
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
                      href={`${ARC_DISPLAY.explorerUrl}/tx/${latest.arc_tx_hash}`}
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
              <p className="text-[20px] sm:text-[24px] leading-[1.3] font-medium tracking-tight opacity-70">
                No decisions on record yet. {readOnly ? "Sign in at /onboard to mint your own wallet and run the agent." : "Fund the wallet below and hit"}
                {!readOnly && (
                  <span className="px-2 mx-2 border-2 border-black inline-block label" style={{ background: "#00FF66" }}>
                    ▶ Run agent now
                  </span>
                )}
                {!readOnly && " — the agent reads the market, decides weights inside your bands, executes the rebalance onchain, and pins the trace."}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ─── POSITIONS ──────────────────────────────────────────────── */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 py-10">
          <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
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
          <PositionsTable balances={balances} latest={latest} loading={loading && !balances} />
        </div>
      </section>

      {/* ─── DEPOSIT ────────────────────────────────────────────────── */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 lg:col-span-4 lg:border-r lg:border-black py-10 lg:pr-6">
            <div className="label mb-4">06 / Deposit</div>
            <a
              href={`${ARC_DISPLAY.explorerUrl}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-black p-3 bg-white inline-block hover:bg-[#fff6a3] transition-colors"
              aria-label="View this address on arcscan"
            >
              <QRCodeSVG
                value={`${ARC_DISPLAY.explorerUrl}/address/${address}`}
                size={150}
                marginSize={0}
                fgColor="#000000"
              />
            </a>
            <p className="label opacity-70 mt-3">
              Scan or click → arcscan
            </p>
          </div>
          <div className="col-span-12 lg:col-span-8 py-10 lg:pl-6 space-y-4">
            <div className="label">Arc Testnet address</div>
            <code className="block font-mono text-sm sm:text-base break-all border-2 border-black p-3 sm:p-4 leading-tight">
              {address}
            </code>
            <div className="grid sm:grid-cols-3 gap-3">
              <button onClick={onCopyAddress} className="btn" disabled={!onCopyAddress}>
                ▶ Copy address
              </button>
              <a
                href={`${ARC_DISPLAY.explorerUrl}/address/${address}`}
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
              token — no ETH required.
            </p>
          </div>
        </div>
      </section>

      {/* ─── TESTNET FAUCET ─────────────────────────────────────────── */}
      {!readOnly && onMintToken ? (
        <section className="border-b-2 border-black">
          <div className="mx-auto max-w-[1280px] px-6 py-10">
            <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
              <div className="label">07 / Testnet faucet</div>
              <div className="label opacity-60">mock tokens · open mint</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FaucetButton
                label="Mint 1,000 USDC"
                token="usdc"
                onMint={onMintToken}
                busy={minting === "usdc"}
                disabled={minting !== null && minting !== "usdc"}
              />
              <FaucetButton
                label="Mint 1,000 EURC"
                token="eurc"
                onMint={onMintToken}
                busy={minting === "eurc"}
                disabled={minting !== null && minting !== "eurc"}
              />
              <FaucetButton
                label="Mint 0.0013 cirBTC"
                token="cirbtc"
                onMint={onMintToken}
                busy={minting === "cirbtc"}
                disabled={minting !== null && minting !== "cirbtc"}
              />
            </div>
            <p className="text-sm opacity-70 leading-relaxed mt-4">
              Mints land in your Circle wallet in a few seconds via{" "}
              <code className="ledger normal-case text-xs">mint(address,uint256)</code>{" "}
              on the hackathon mock tokens. Real Arc tokens don&apos;t support
              this — use{" "}
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                faucet.circle.com
              </a>{" "}
              for those.
            </p>
          </div>
        </section>
      ) : null}

      {/* ─── HISTORY ────────────────────────────────────────────────── */}
      {decisions.length > 1 ? (
        <section className="border-b-2 border-black">
          <div className="mx-auto max-w-[1280px] px-6 py-10">
            <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
              <div className="label">
                08 / History · {decisions.length - 1} prior {decisions.length - 1 === 1 ? "decision" : "decisions"}
              </div>
              <div className="label opacity-60">click any row →</div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block border-2 border-black">
              <div className="grid grid-cols-[130px_110px_1fr_80px] label bg-black text-white">
                <div className="px-4 py-2.5">When</div>
                <div className="px-4 py-2.5 border-l border-white/20">Regime</div>
                <div className="px-4 py-2.5 border-l border-white/20">Note</div>
                <div className="px-4 py-2.5 border-l border-white/20 text-right">State</div>
              </div>
              {decisions.slice(1).map((d, i, arr) => (
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
                    {d.executed ? "▍ Exec" : d.partial ? "▎ Part." : "○ Plan"}
                  </div>
                </Link>
              ))}
            </div>

            {/* Mobile card stack */}
            <ul className="md:hidden border-2 border-black divide-y divide-black">
              {decisions.slice(1).map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/trace/${d.id}`}
                    className="block px-4 py-3 hover:bg-[#fff6a3] active:bg-[#fff6a3] transition-colors"
                  >
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="label ledger">
                        {new Date(d.created_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <RegimePill regime={d.regime} size="sm" />
                      <span className="label ml-auto">
                        {d.executed ? "▍ Exec" : d.partial ? "▎ Part." : "○ Plan"}
                      </span>
                    </div>
                    <p className="text-sm leading-snug truncate">{d.reasoning}</p>
                  </Link>
                </li>
              ))}
            </ul>

            {hasMore && onLoadMore ? (
              <div className="pt-6 flex justify-center">
                <button onClick={onLoadMore} disabled={loadingMore} className="btn">
                  {loadingMore ? "▢ Loading…" : "▢ Load older decisions"}
                </button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ─── FOOTER ─────────────────────────────────────────────────── */}
      <footer>
        <div className="mx-auto max-w-[1280px] px-6 py-4 flex flex-wrap items-baseline justify-between gap-3 label">
          <span>Trapeza ▍ Treasury OS ▍ {ARC_DISPLAY.name} · chainId {ARC_DISPLAY.chainId}</span>
          <span className="opacity-60">Cron · every 15 min · GitHub Actions</span>
        </div>
      </footer>
    </div>
  );
}

function PnlPill({
  deltaUsd,
  deltaPct,
}: {
  deltaUsd: number;
  deltaPct: number;
}) {
  // Treat |delta| < 1 cent + |pct| < 0.005% as flat. Avoids "+$0.00 (+0.00%)"
  // when CoinGecko's 24h change rounds to ~zero on quiet days.
  const flat = Math.abs(deltaUsd) < 0.01 && Math.abs(deltaPct) < 0.005;
  const sign = flat ? "—" : deltaUsd >= 0 ? "▲" : "▼";
  const bg = flat ? "#FFFFFF" : deltaUsd >= 0 ? "var(--acid)" : "var(--red)";
  const fg = flat ? "#000" : deltaUsd >= 0 ? "#000" : "#FFFFFF";
  const absUsd = Math.abs(deltaUsd).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const absPct = Math.abs(deltaPct).toFixed(2);
  const usdLabel = flat
    ? "Flat"
    : `${deltaUsd >= 0 ? "+" : "−"}$${absUsd}`;
  const pctLabel = flat ? "" : `${deltaUsd >= 0 ? "+" : "−"}${absPct}%`;
  return (
    <div
      className="inline-flex items-center gap-2 border-2 border-black px-2.5 py-1 label whitespace-nowrap"
      style={{ background: bg, color: fg }}
      aria-label={`24-hour change ${usdLabel} ${pctLabel}`}
    >
      <span aria-hidden>{sign}</span>
      <span className="ledger normal-case tracking-tight">
        {usdLabel}
        {pctLabel ? <span className="opacity-80">{" "}({pctLabel})</span> : null}
      </span>
      <span className="opacity-60">· 24h</span>
    </div>
  );
}

function FaucetButton({
  label,
  token,
  onMint,
  busy,
  disabled,
}: {
  label: string;
  token: "usdc" | "eurc" | "cirbtc";
  onMint: (token: "usdc" | "eurc" | "cirbtc") => void;
  busy: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onMint(token)}
      disabled={busy || disabled}
      className="btn !text-sm !py-4"
    >
      {busy ? "▶ Minting…" : `▶ ${label}`}
    </button>
  );
}

function ExecutedBadge({ executed, partial }: { executed: boolean; partial: boolean }) {
  const { bg, label } = executed
    ? { bg: "#00FF66", label: "▍ Executed" }
    : partial
      ? { bg: "#FFEE00", label: "▎ Partial" }
      : { bg: "#FFFFFF", label: "○ Plan only" };
  return (
    <span
      className="inline-block w-fit border-2 border-black px-2 py-1 label"
      style={{ background: bg }}
    >
      {label}
    </span>
  );
}

function Datum({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      {loading ? (
        <Skeleton heightClass="h-6 w-24" />
      ) : (
        <div className="text-lg font-bold tabular-nums ledger">{value}</div>
      )}
    </div>
  );
}

function Skeleton({ heightClass }: { heightClass: string }) {
  return (
    <div className={`${heightClass} bg-black/5 animate-pulse border border-black/10`} />
  );
}

function timeAgo(iso: string): string {
  const elapsedMs = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.round(elapsedMs / 1000));
  if (sec < 30) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  return `${days}d ago`;
}

function PositionsTable({
  balances,
  latest,
  loading,
}: {
  balances: TokenBalances | null;
  latest: DecisionRow | undefined;
  loading: boolean;
}) {
  const rows = [
    {
      symbol: "USDC",
      hint: "cash · native gas",
      amount: balances?.usdc,
      usd: balances?.totals_usd.usdc,
      target: latest?.target_weights.usdc,
    },
    {
      symbol: "USYC",
      hint: "yield · ~10% APY",
      amount: balances?.usyc,
      usd: balances?.totals_usd.usyc,
      target: latest?.target_weights.usyc,
    },
    {
      symbol: "EURC",
      hint: "safe-FX",
      amount: balances?.eurc,
      usd: balances?.totals_usd.eurc,
      target: latest?.target_weights.eurc,
    },
    {
      symbol: "cirBTC",
      hint: "risk",
      amount: balances?.cirbtc,
      usd: balances?.totals_usd.cirbtc,
      target: latest?.target_weights.cirbtc,
    },
  ];

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block border-2 border-black">
        <div className="grid grid-cols-[1fr_120px_120px_80px] label bg-black text-white">
          <div className="px-4 py-2.5">Symbol</div>
          <div className="px-4 py-2.5 border-l border-white/20 text-right">Units</div>
          <div className="px-4 py-2.5 border-l border-white/20 text-right">USD value</div>
          <div className="px-4 py-2.5 border-l border-white/20 text-right">Target</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.symbol}
            className={`grid grid-cols-[1fr_120px_120px_80px] items-center ${
              i < rows.length - 1 ? "border-b border-black" : ""
            }`}
          >
            <div className="px-4 py-4">
              <div className="text-lg font-bold tracking-tight">{r.symbol}</div>
              <div className="label-sm text-[color:var(--ink-muted)]">{r.hint}</div>
            </div>
            <div className="px-4 py-4 border-l border-black text-right ledger text-sm tabular-nums">
              {loading ? "…" : r.amount !== undefined ? r.amount.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}
            </div>
            <div className="px-4 py-4 border-l border-black text-right text-base font-bold tabular-nums">
              {loading ? "…" : r.usd !== undefined ? `$${r.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
            </div>
            <div className="px-4 py-4 border-l border-black text-right ledger label tabular-nums">
              {r.target !== undefined ? `${(r.target * 100).toFixed(0)}%` : "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile card stack */}
      <ul className="sm:hidden border-2 border-black divide-y divide-black">
        {rows.map((r) => (
          <li key={r.symbol} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-lg font-bold tracking-tight">{r.symbol}</div>
                <div className="label-sm text-[color:var(--ink-muted)]">{r.hint}</div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold tabular-nums">
                  {loading ? "…" : r.usd !== undefined ? `$${r.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                </div>
                <div className="label ledger opacity-70 tabular-nums">
                  {loading ? "" : r.amount !== undefined ? r.amount.toLocaleString(undefined, { maximumFractionDigits: 6 }) : ""}
                  {r.target !== undefined ? ` · ${(r.target * 100).toFixed(0)}% tgt` : ""}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

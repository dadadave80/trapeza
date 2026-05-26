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
//
// Terminal mode: phosphor-green CRT aesthetic, dashed dividers, ASCII fills,
// bracketed-uppercase labels. Functional shape unchanged from the previous
// brutalist version — every prop / handler is preserved.

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
  onRefresh?: () => void;
  onRunAgent?: () => void;
  onInitializeBands?: () => void;
  onLoadMore?: () => void;
  onCopyAddress?: () => void;
  onMintToken?: (token: "usdc" | "eurc" | "cirbtc") => void;
  minting?: "usdc" | "eurc" | "cirbtc" | null;
  readOnly?: boolean;
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
        signOut={!readOnly}
      />

      <div className="mx-auto max-w-[1180px] px-5">
        {/* ─── HERO ─────────────────────────────────────────────── */}
        <section
          className="grid grid-cols-12 gap-6 py-6 border-b border-dashed"
          style={{ borderColor: "var(--green-dim)" }}
        >
          <div className="col-span-12 md:col-span-7 space-y-3 min-w-0">
            <div className="section-marker flex items-center justify-between gap-3 flex-wrap">
              <span>[01] PORTFOLIO·VALUE</span>
              <span className="normal-case tracking-normal text-[color:var(--green-dim)]">
                {band.label.toUpperCase()} MANDATE
              </span>
            </div>
            {loading ? (
              <Skeleton heightClass="h-[80px] sm:h-[100px] lg:h-[120px]" />
            ) : balances ? (
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 max-w-full">
                <div
                  className="font-bold tabular-nums leading-[0.9] tracking-[-0.02em] min-w-0"
                  style={{
                    fontSize: "clamp(40px, 9vw, 96px)",
                    color: "var(--white)",
                  }}
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
                className="font-bold tabular-nums leading-[0.9] tracking-[-0.02em] opacity-30"
                style={{ fontSize: "clamp(40px, 9vw, 96px)" }}
              >
                $—
              </div>
            )}
            <div className="text-[11px]" style={{ color: "var(--green-dim)" }}>
              {balances ? (
                <>
                  CIRBTC ${balances.prices.cirbtc.toLocaleString()} · EURC $
                  {balances.prices.eurc.toFixed(3)} · USYC $
                  {balances.prices.usyc.toFixed(4)} · SRC{" "}
                  {balances.price_source.toUpperCase()}
                </>
              ) : (
                "AWAITING ORACLE…"
              )}
            </div>
          </div>

          <div className="col-span-12 md:col-span-5">
            <p className="section-marker mb-2">[02] REGIME·INDICATOR</p>
            <div
              className="border p-3 flex items-baseline justify-between gap-3 flex-wrap"
              style={{
                borderColor: "var(--green-dim)",
                background: "var(--bg-soft)",
              }}
            >
              <div>
                <RegimeLockup
                  regime={latest?.regime ?? "neutral"}
                  confidence={undefined}
                />
                <div className="label mt-2">
                  {latest ? (
                    <>LAST DECISION · {timeAgo(latest.created_at)}</>
                  ) : lastCheckedAt ? (
                    <>AGENT WOKE UP · {timeAgo(lastCheckedAt)}</>
                  ) : (
                    <>NO AGENT RUN YET</>
                  )}
                </div>
              </div>
              {readOnly ? null : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={onRunAgent}
                    disabled={running || initializing}
                    className="btn-acid btn-sm whitespace-nowrap"
                  >
                    {running ? "[RUNNING…]" : "[RUN AGENT NOW]"}
                  </button>
                  <button
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="btn btn-sm whitespace-nowrap"
                  >
                    {refreshing ? "[REFRESH…]" : "[REFRESH]"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ─── ALLOCATION ──────────────────────────────────────── */}
        <section
          className="py-6 border-b border-dashed"
          style={{ borderColor: "var(--green-dim)" }}
        >
          <p className="section-marker mb-3">
            [03] ALLOCATION · CURRENT vs TARGET
          </p>
          {loading ? (
            <Skeleton heightClass="h-32" />
          ) : (
            <AllocationBar
              actual={currentWeights}
              target={latest?.target_weights}
            />
          )}
        </section>

        {/* ─── INITIALIZE BANDS callout ───────────────────────── */}
        {isFundedButFlat && !readOnly ? (
          <section
            className="py-4 border-b border-dashed"
            style={{
              borderColor: "var(--amber)",
              background: "var(--amber-soft)",
            }}
          >
            <div className="grid grid-cols-12 gap-x-4 items-center">
              <div className="col-span-12 lg:col-span-9">
                <div
                  className="section-marker mb-2"
                  style={{ color: "var(--amber)" }}
                >
                  ▍ ONE-TIME SETUP
                </div>
                <p className="text-[13px] leading-relaxed text-[color:var(--white)]">
                  Wallet holds USDC but no USYC / EURC / cirBTC yet — the agent
                  can&apos;t rebalance until each leg has a starting balance.
                  Click to seed the mid-band weights for{" "}
                  <span style={{ color: "var(--amber)" }}>
                    {band.label.toUpperCase()}
                  </span>
                  .
                </p>
              </div>
              <div className="col-span-12 lg:col-span-3 mt-3 lg:mt-0 flex justify-end">
                <button
                  onClick={onInitializeBands}
                  disabled={initializing || running}
                  className="btn-inverse btn-sm whitespace-nowrap"
                >
                  {initializing ? "[SEEDING…]" : "[INITIALIZE BANDS]"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {/* ─── REASONING ───────────────────────────────────────── */}
        <section
          className="py-6 border-b border-dashed"
          style={{ borderColor: "var(--green-dim)" }}
        >
          <p className="section-marker mb-3">
            [04] AGENT·MEMO
            {latest ? (
              <span style={{ color: "var(--green-dim)" }}>
                {" · "}
                {new Date(latest.created_at)
                  .toISOString()
                  .slice(0, 16)
                  .replace("T", " ")}
                Z
              </span>
            ) : null}
          </p>
          <div
            className="border p-4 space-y-4"
            style={{
              borderColor: "var(--green-dim)",
              background: "var(--bg-soft)",
            }}
          >
            {loading && !latest ? (
              <Skeleton heightClass="h-24" />
            ) : latest ? (
              <>
                <p
                  className="text-[14px] leading-[1.6]"
                  style={{ color: "var(--white)" }}
                >
                  <span style={{ color: "var(--green)" }}>&gt;</span>{" "}
                  {latest.reasoning}
                </p>

                {latest.alerts?.length ? (
                  <ul
                    className="border-l-2 pl-3 space-y-1"
                    style={{ borderColor: "var(--red)" }}
                  >
                    {latest.alerts.map((a, i) => (
                      <li
                        key={i}
                        className="text-[12px]"
                        style={{ color: "var(--red)" }}
                      >
                        ⚠ {a}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div
                  className="grid sm:grid-cols-[auto_auto_1fr_auto] gap-x-5 gap-y-1.5 items-baseline text-[11px] pt-3 border-t border-dashed"
                  style={{ borderColor: "var(--green-dim)" }}
                >
                  <span
                    className="flex items-center gap-1.5"
                    style={{
                      color: latest.executed
                        ? "var(--green)"
                        : latest.partial
                          ? "var(--amber)"
                          : "var(--green-dim)",
                    }}
                  >
                    <span aria-hidden>●</span>{" "}
                    {latest.executed
                      ? "EXECUTED"
                      : latest.partial
                        ? "PARTIAL"
                        : "PLAN ONLY"}
                  </span>
                  {latest.arc_tx_hash ? (
                    <a
                      href={`${ARC_DISPLAY.explorerUrl}/tx/${latest.arc_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline tracking-tight normal-case"
                      style={{ color: "var(--amber)" }}
                    >
                      SWAP·TX {latest.arc_tx_hash.slice(0, 8)}…
                      {latest.arc_tx_hash.slice(-6)}
                    </a>
                  ) : (
                    <span />
                  )}
                  {latest.trace_hash ? (
                    <span
                      className="tracking-tight normal-case"
                      title={latest.trace_hash}
                      style={{ color: "var(--green-dim)" }}
                    >
                      TRACE·SHA256 {latest.trace_hash.slice(0, 10)}…
                      {latest.trace_hash.slice(-6)}
                    </span>
                  ) : (
                    <span />
                  )}
                  <Link
                    href={`/trace/${latest.id}`}
                    className="underline sm:text-right uppercase tracking-[0.25em]"
                    style={{ color: "var(--green)" }}
                  >
                    [FULL DECISION →]
                  </Link>
                </div>
              </>
            ) : (
              <p
                className="text-[14px] leading-[1.6]"
                style={{ color: "var(--green-dim)" }}
              >
                <span style={{ color: "var(--green)" }}>&gt;</span> No decisions
                on record yet.
                {readOnly
                  ? " Sign in at /onboard to mint your own wallet and run the agent."
                  : " Fund the wallet, hit [RUN AGENT NOW] — the agent reads the market, decides weights inside your bands, executes onchain, and pins the trace."}
              </p>
            )}
          </div>
        </section>

        {/* ─── POSITIONS ───────────────────────────────────────── */}
        <section
          className="py-6 border-b border-dashed"
          style={{ borderColor: "var(--green-dim)" }}
        >
          <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
            <p className="section-marker">
              [05] POSITIONS · SYM | UNITS | USD | TARGET
            </p>
            {error ? (
              <span className="label" style={{ color: "var(--red)" }}>
                ERROR: {error}
              </span>
            ) : balances ? (
              <span className="label">
                FETCHED {new Date(balances.fetched_at)
                  .toISOString()
                  .slice(11, 19)}
                Z
              </span>
            ) : null}
          </div>
          <PositionsTable
            balances={balances}
            latest={latest}
            loading={loading && !balances}
          />
        </section>

        {/* ─── DEPOSIT ─────────────────────────────────────────── */}
        <section
          className="py-6 border-b border-dashed grid grid-cols-12 gap-6"
          style={{ borderColor: "var(--green-dim)" }}
        >
          <div className="col-span-12 md:col-span-5">
            <p className="section-marker mb-3">[06] DEPOSIT · ARC·TESTNET</p>
            <div
              className="border p-3"
              style={{
                borderColor: "var(--green-dim)",
                background: "var(--bg-soft)",
              }}
            >
              <a
                href={`${ARC_DISPLAY.explorerUrl}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block p-2"
                aria-label="View this address on arcscan"
                style={{ background: "var(--bg)" }}
              >
                <QRCodeSVG
                  value={`${ARC_DISPLAY.explorerUrl}/address/${address}`}
                  size={140}
                  marginSize={0}
                  bgColor="#0a0e08"
                  fgColor="#a5f584"
                />
              </a>
              <div className="mt-3 space-y-1">
                <div className="label">ADDR</div>
                <code
                  className="block text-[11px] break-all leading-tight"
                  style={{ color: "var(--amber)" }}
                >
                  {address}
                </code>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={onCopyAddress}
                  className="btn btn-sm"
                  disabled={!onCopyAddress}
                >
                  [COPY]
                </button>
                <a
                  href={`${ARC_DISPLAY.explorerUrl}/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                >
                  [EXPLORER ↗]
                </a>
                <a
                  href="https://faucet.circle.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-inverse btn-sm ml-auto"
                >
                  [FAUCET ↗]
                </a>
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-7 space-y-3">
            <p className="section-marker">EXTERNAL TRANSFER</p>
            <p
              className="text-[13px] leading-relaxed"
              style={{ color: "var(--green-dim)" }}
            >
              Send testnet USDC, EURC, or cirBTC to the address on the left.
              On Arc, USDC is the native gas token — no ETH required. For
              instant in-app top-ups, use the faucet section below.
            </p>
          </div>
        </section>

        {/* ─── TESTNET FAUCET ─────────────────────────────────── */}
        {!readOnly && onMintToken ? (
          <section
            className="py-6 border-b border-dashed"
            style={{ borderColor: "var(--green-dim)" }}
          >
            <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
              <p className="section-marker">[07] TESTNET·FAUCET</p>
              <span className="label">MOCK TOKENS · OPEN MINT</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FaucetButton
                label="MINT 1,000 USDC"
                token="usdc"
                onMint={onMintToken}
                busy={minting === "usdc"}
                disabled={minting !== null && minting !== "usdc"}
              />
              <FaucetButton
                label="MINT 1,000 EURC"
                token="eurc"
                onMint={onMintToken}
                busy={minting === "eurc"}
                disabled={minting !== null && minting !== "eurc"}
              />
              <FaucetButton
                label="MINT 0.0013 CIRBTC"
                token="cirbtc"
                onMint={onMintToken}
                busy={minting === "cirbtc"}
                disabled={minting !== null && minting !== "cirbtc"}
              />
            </div>
            <p
              className="text-[12px] leading-relaxed mt-3"
              style={{ color: "var(--green-dim)" }}
            >
              Mints land in the connected Circle wallet in a few seconds via{" "}
              <code style={{ color: "var(--amber)" }}>
                mint(address,uint256)
              </code>{" "}
              on the hackathon mocks. Real Arc tokens don&apos;t support this —
              use{" "}
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: "var(--green)" }}
              >
                faucet.circle.com
              </a>{" "}
              for those.
            </p>
          </section>
        ) : null}

        {/* ─── HISTORY ─────────────────────────────────────────── */}
        {decisions.length > 0 ? (
          <section
            className="py-6 border-b border-dashed"
            style={{ borderColor: "var(--green-dim)" }}
          >
            <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
              <p className="section-marker">
                [08] DECISION·LOG · LAST {decisions.length}{" "}
                {decisions.length === 1 ? "ENTRY" : "ENTRIES"}
              </p>
              <span className="label">CLICK ANY ROW →</span>
            </div>

            <div className="space-y-1">
              {decisions.map((d, i) => (
                <Link
                  key={d.id}
                  href={`/trace/${d.id}`}
                  className="grid grid-cols-[auto_auto_auto_1fr_auto] gap-x-4 items-baseline py-1.5 px-2 -mx-2 transition-colors hover:bg-[color:var(--bg-row-hover)]"
                  aria-current={i === 0 ? "true" : undefined}
                >
                  <span
                    className="text-[10px] tracking-[0.25em] uppercase tabular-nums whitespace-nowrap"
                    style={{
                      color:
                        i === 0 ? "var(--amber)" : "var(--green-dim)",
                      visibility: i === 0 ? "visible" : "hidden",
                    }}
                    aria-label={i === 0 ? "Latest decision" : undefined}
                  >
                    ▶
                  </span>
                  <span
                    className="text-[11px] tabular-nums whitespace-nowrap"
                    style={{ color: "var(--green-dim)" }}
                  >
                    {new Date(d.created_at)
                      .toISOString()
                      .slice(5, 16)
                      .replace("T", " ")}
                  </span>
                  <RegimePill regime={d.regime} size="sm" />
                  <span
                    className="text-[12px] truncate"
                    style={{ color: "var(--white)" }}
                  >
                    {d.reasoning}
                  </span>
                  <span
                    className="text-[10px] tracking-[0.25em] uppercase whitespace-nowrap"
                    style={{
                      color: d.executed
                        ? "var(--green)"
                        : d.partial
                          ? "var(--amber)"
                          : "var(--green-dim)",
                    }}
                  >
                    {d.executed ? "EXEC" : d.partial ? "PART" : "PLAN"}
                  </span>
                </Link>
              ))}
            </div>

            {hasMore && onLoadMore ? (
              <div className="pt-4 flex justify-center">
                <button
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="btn btn-sm"
                >
                  {loadingMore ? "[LOADING…]" : "[LOAD OLDER]"}
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* ─── FOOTER ──────────────────────────────────────────── */}
        <footer className="pt-4 pb-6 flex flex-wrap items-baseline justify-between gap-3 label">
          <span>
            TRAPEZA·TERM · {ARC_DISPLAY.name.toUpperCase()} · CHAIN{" "}
            {ARC_DISPLAY.chainId}
          </span>
          <span>CRON · */15 · GITHUB ACTIONS</span>
        </footer>
      </div>
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
  const color = flat
    ? "var(--green-dim)"
    : deltaUsd >= 0
      ? "var(--green)"
      : "var(--red)";
  const sign = flat ? "—" : deltaUsd >= 0 ? "▲" : "▼";
  const absUsd = Math.abs(deltaUsd).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const absPct = Math.abs(deltaPct).toFixed(2);
  const usdLabel = flat
    ? "FLAT"
    : `${deltaUsd >= 0 ? "+" : "−"}$${absUsd}`;
  const pctLabel = flat ? "" : `${deltaUsd >= 0 ? "+" : "−"}${absPct}%`;
  return (
    <div
      className="inline-flex items-center gap-2 border px-2 py-1 whitespace-nowrap text-[11px] tracking-[0.15em]"
      style={{ color, borderColor: color, background: "var(--bg-soft)" }}
      aria-label={`24-hour change ${usdLabel} ${pctLabel}`}
    >
      <span aria-hidden>{sign}</span>
      <span className="tabular-nums">
        {usdLabel}
        {pctLabel ? (
          <span style={{ color: "var(--green-dim)" }}> ({pctLabel})</span>
        ) : null}
      </span>
      <span style={{ color: "var(--green-dim)" }}>· 24H</span>
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
      className="btn !text-[11px] !py-3 w-full"
    >
      {busy ? "[MINTING…]" : `[${label}]`}
    </button>
  );
}

function Skeleton({ heightClass }: { heightClass: string }) {
  return (
    <div
      className={`${heightClass} animate-pulse border border-dashed`}
      style={{
        borderColor: "var(--green-dim)",
        background: "var(--bg-soft)",
      }}
    />
  );
}

function timeAgo(iso: string): string {
  const elapsedMs = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.round(elapsedMs / 1000));
  if (sec < 30) return "JUST NOW";
  if (sec < 60) return `${sec}S AGO`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}M AGO`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}H AGO`;
  const days = Math.round(hr / 24);
  return `${days}D AGO`;
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
      color: "var(--white)",
    },
    {
      symbol: "USYC",
      hint: "yield · ~10% apy",
      amount: balances?.usyc,
      usd: balances?.totals_usd.usyc,
      target: latest?.target_weights.usyc,
      color: "var(--amber)",
    },
    {
      symbol: "EURC",
      hint: "safe-fx",
      amount: balances?.eurc,
      usd: balances?.totals_usd.eurc,
      target: latest?.target_weights.eurc,
      color: "var(--white)",
    },
    {
      symbol: "CIRBTC",
      hint: "risk",
      amount: balances?.cirbtc,
      usd: balances?.totals_usd.cirbtc,
      target: latest?.target_weights.cirbtc,
      color: "var(--green)",
    },
  ];

  return (
    <table className="w-full text-[12px]">
      <thead>
        <tr
          className="text-left text-[10px] tracking-[0.25em] uppercase border-b border-dashed"
          style={{
            color: "var(--green-dim)",
            borderColor: "var(--green-dim)",
          }}
        >
          <th className="py-1.5 font-normal">SYMBOL</th>
          <th className="py-1.5 font-normal text-right">UNITS</th>
          <th className="py-1.5 font-normal text-right">USD</th>
          <th className="py-1.5 font-normal text-right">TGT</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.symbol}
            className="border-b border-dotted"
            style={{ borderColor: "var(--green-dim)" }}
          >
            <td className="py-2">
              <span className="font-bold tracking-[0.15em]" style={{ color: r.color }}>
                {r.symbol}
              </span>{" "}
              <span
                className="text-[10px] uppercase tracking-[0.15em]"
                style={{ color: "var(--green-dim)" }}
              >
                {r.hint}
              </span>
            </td>
            <td
              className="py-2 text-right tabular-nums"
              style={{ color: "var(--green)" }}
            >
              {loading
                ? "…"
                : r.amount !== undefined
                  ? r.amount.toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })
                  : "—"}
            </td>
            <td
              className="py-2 text-right tabular-nums font-bold"
              style={{ color: "var(--white)" }}
            >
              {loading
                ? "…"
                : r.usd !== undefined
                  ? `$${r.usd.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "—"}
            </td>
            <td
              className="py-2 text-right tabular-nums"
              style={{ color: "var(--amber)" }}
            >
              {r.target !== undefined
                ? `${(r.target * 100).toFixed(0)}%`
                : "—"}
            </td>
          </tr>
        ))}
        <tr>
          <td
            className="pt-3 text-[10px] tracking-[0.3em] uppercase"
            style={{ color: "var(--green-dim)" }}
          >
            TOTAL
          </td>
          <td />
          <td
            className="pt-3 text-right tabular-nums font-bold"
            style={{ color: "var(--white)" }}
          >
            {balances
              ? `$${balances.total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "—"}
          </td>
          <td />
        </tr>
      </tbody>
    </table>
  );
}

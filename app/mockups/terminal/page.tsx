import Link from "next/link";
import { MOCK } from "../_data";

// === TRAPEZA TERMINAL ============================================
// Phosphor-green CRT aesthetic. JetBrains-style monospace everywhere,
// hard ASCII rules, all-caps, density over decoration. For the user
// who thinks Bloomberg is verbose.
// ================================================================

const BG = "#0A0E08";
const GREEN = "#A5F584";
const GREEN_DIM = "#5A8C45";
const AMBER = "#FFC857";
const RED = "#FF6B6B";
const WHITE = "#E8F0E0";
const ROW = "#101510";

const REGIME_COLOR: Record<string, string> = {
  risk_on: GREEN,
  risk_off: RED,
  neutral: AMBER,
};

function bar(pct: number, width = 40): string {
  const filled = Math.round((pct / 100) * width);
  return "█".repeat(filled) + "░".repeat(Math.max(0, width - filled));
}

export default function TerminalMockup() {
  const d = MOCK.latestDecision;
  return (
    <div
      style={{ background: BG, color: GREEN, fontFamily: "var(--font-mono), monospace" }}
      className="min-h-screen text-[13px] leading-[1.45]"
    >
      <div className="mx-auto max-w-[1180px] p-5">
        {/* ─── TOP BAR ─────────────────────────────────────────────── */}
        <div
          className="grid grid-cols-[1fr_auto_auto] items-center gap-6 pb-3 border-b border-dashed"
          style={{ borderColor: GREEN_DIM }}
        >
          <div className="flex items-center gap-4">
            <span style={{ color: AMBER }} className="text-base font-bold tracking-[0.3em]">
              TRAPEZA·TERM
            </span>
            <span style={{ color: GREEN_DIM }} className="text-[11px]">
              v0.4.0 · ARC-TESTNET · 5042002
            </span>
          </div>
          <span style={{ color: GREEN_DIM }} className="text-[11px]">
            USR {MOCK.user.email} · MAND {MOCK.user.mandate.toUpperCase()}
          </span>
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: GREEN }}>
            <span className="size-2 rounded-full animate-pulse" style={{ background: GREEN }} />
            LIVE · {new Date(MOCK.portfolio.fetchedAt).toISOString().slice(11, 19)}Z
          </span>
        </div>

        {/* ─── HERO ────────────────────────────────────────────────── */}
        <section className="grid grid-cols-12 gap-6 py-6 border-b border-dashed" style={{ borderColor: GREEN_DIM }}>
          <div className="col-span-12 md:col-span-7 space-y-2">
            <p style={{ color: GREEN_DIM }} className="text-[10px] tracking-[0.3em]">
              [01] PORTFOLIO·VALUE
            </p>
            <div className="text-[68px] leading-none font-bold tabular-nums" style={{ color: WHITE }}>
              ${MOCK.portfolio.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ color: GREEN_DIM }} className="text-[11px]">
              CIRBTC ${MOCK.prices.cirbtc.toLocaleString()} · EURC ${MOCK.prices.eurc.toFixed(3)} · SRC {MOCK.prices.source.toUpperCase()}
            </div>
          </div>

          <div className="col-span-12 md:col-span-5">
            <p style={{ color: GREEN_DIM }} className="text-[10px] tracking-[0.3em] mb-2">
              [02] REGIME·INDICATOR
            </p>
            <div
              className="border p-3 flex items-baseline justify-between"
              style={{ borderColor: GREEN_DIM, background: ROW }}
            >
              <div>
                <div
                  className="text-2xl font-bold tracking-[0.2em]"
                  style={{ color: REGIME_COLOR[d.regime] }}
                >
                  &gt; {d.regime.toUpperCase().replace("_", "-")}
                </div>
                <div style={{ color: GREEN_DIM }} className="text-[11px] mt-1">
                  CONF {(d.confidence * 100).toFixed(0)}% · DELTA POSITIVE
                </div>
              </div>
              <button
                className="border px-3 py-1.5 text-[11px] tracking-[0.2em] hover:bg-[#1A2017]"
                style={{ borderColor: GREEN, color: GREEN }}
              >
                [RUN AGENT NOW]
              </button>
            </div>
          </div>
        </section>

        {/* ─── ALLOCATION ASCII ────────────────────────────────────── */}
        <section className="py-6 border-b border-dashed" style={{ borderColor: GREEN_DIM }}>
          <p style={{ color: GREEN_DIM }} className="text-[10px] tracking-[0.3em] mb-3">
            [03] ALLOCATION·CURRENT·VS·TARGET
          </p>
          <pre className="text-[12px] leading-[1.5] overflow-x-auto" style={{ color: GREEN }}>
{`         CURRENT                                      TARGET
USDC     ${bar(MOCK.positions[0].actual * 100)}  ${(MOCK.positions[0].actual * 100).toFixed(1).padStart(5)}%  →  ${(MOCK.positions[0].target * 100).toFixed(1).padStart(5)}%
EURC     ${bar(MOCK.positions[1].actual * 100)}  ${(MOCK.positions[1].actual * 100).toFixed(1).padStart(5)}%  →  ${(MOCK.positions[1].target * 100).toFixed(1).padStart(5)}%
CIRBTC   ${bar(MOCK.positions[2].actual * 100)}  ${(MOCK.positions[2].actual * 100).toFixed(1).padStart(5)}%  →  ${(MOCK.positions[2].target * 100).toFixed(1).padStart(5)}%`}
          </pre>
          <p style={{ color: GREEN_DIM }} className="text-[10px] mt-3">
            DRIFT [MAX 6.4PCT vs THRESHOLD 5.0PCT] · REBALANCE REQUIRED
          </p>
        </section>

        {/* ─── REASONING ───────────────────────────────────────────── */}
        <section className="py-6 border-b border-dashed" style={{ borderColor: GREEN_DIM }}>
          <p style={{ color: GREEN_DIM }} className="text-[10px] tracking-[0.3em] mb-3">
            [04] AGENT·MEMO · {new Date(d.createdAt).toISOString().slice(0, 16).replace("T", " ")}Z
          </p>
          <div className="border p-4" style={{ borderColor: GREEN_DIM, background: ROW }}>
            <p className="text-[14px] leading-[1.6]" style={{ color: WHITE }}>
              <span style={{ color: GREEN }}>&gt;</span> {d.reasoning}
            </p>
            <div className="mt-4 grid grid-cols-[auto_auto_auto_1fr] gap-x-5 gap-y-1 text-[11px] items-center">
              <span style={{ color: GREEN }}>● EXECUTED</span>
              <span style={{ color: GREEN_DIM }}>SWAP·TX</span>
              <a className="underline" style={{ color: AMBER }} href="#">
                {d.arcTxHash.slice(0, 14)}…{d.arcTxHash.slice(-6)}
              </a>
              <span />
              <span style={{ color: GREEN_DIM }}>TRACE·SHA256</span>
              <span className="col-span-2" style={{ color: AMBER }}>
                {d.traceHash.slice(0, 14)}…{d.traceHash.slice(-6)}
              </span>
              <a href="#" className="text-right underline" style={{ color: GREEN }}>
                [FULL DECISION →]
              </a>
            </div>
          </div>
        </section>

        {/* ─── POSITIONS ───────────────────────────────────────────── */}
        <section className="grid grid-cols-12 gap-6 py-6 border-b border-dashed" style={{ borderColor: GREEN_DIM }}>
          <div className="col-span-12 md:col-span-7">
            <p style={{ color: GREEN_DIM }} className="text-[10px] tracking-[0.3em] mb-3">
              [05] POSITIONS · SYM | UNITS | USD | TARGET
            </p>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ color: GREEN_DIM }} className="text-left text-[10px] tracking-[0.2em] border-b border-dashed" >
                  <th className="py-1 font-normal">SYMBOL</th>
                  <th className="py-1 font-normal text-right">UNITS</th>
                  <th className="py-1 font-normal text-right">USD</th>
                  <th className="py-1 font-normal text-right">TGT</th>
                </tr>
              </thead>
              <tbody>
                {MOCK.positions.map((p) => (
                  <tr key={p.symbol} className="border-b border-dotted" style={{ borderColor: GREEN_DIM }}>
                    <td className="py-2">
                      <span style={{ color: WHITE }} className="font-bold">
                        {p.symbol}
                      </span>{" "}
                      <span style={{ color: GREEN_DIM }} className="text-[10px]">
                        {p.hint}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums" style={{ color: GREEN }}>
                      {p.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </td>
                    <td className="py-2 text-right tabular-nums" style={{ color: WHITE }}>
                      ${p.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 text-right tabular-nums" style={{ color: AMBER }}>
                      {(p.target * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 text-[10px] tracking-[0.2em]" style={{ color: GREEN_DIM }}>
                    TOTAL
                  </td>
                  <td />
                  <td className="py-2 text-right tabular-nums font-bold" style={{ color: WHITE }}>
                    ${MOCK.portfolio.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          <div className="col-span-12 md:col-span-5">
            <p style={{ color: GREEN_DIM }} className="text-[10px] tracking-[0.3em] mb-3">
              [06] DEPOSIT · ARC·TESTNET
            </p>
            <div className="border p-3" style={{ borderColor: GREEN_DIM, background: ROW }}>
              <pre className="text-[10px] leading-[1.1]" style={{ color: GREEN }}>
{`┌────────────────────┐
│ ▓▓▓▓▓ ▓▓▓ ▓▓▓ ▓▓▓ │
│ ▓ ░ ▓ ░▓░ ▓░▓ ░▓░ │
│ ▓▓▓▓▓ ▓▓░ ░▓▓ ▓▓░ │
│ ░▓░░░ ▓░▓ ▓░░ ░▓▓ │
│ ▓▓▓▓▓ ░▓▓ ▓▓▓ ▓░░ │
│ ░░░░▓ ▓░░ ░▓▓ ▓▓░ │
│ ▓▓▓░▓ ░▓▓ ▓░░ ░▓▓ │
└────────────────────┘`}
              </pre>
              <div className="mt-3 space-y-1">
                <div className="text-[10px] tracking-[0.2em]" style={{ color: GREEN_DIM }}>
                  ADDR
                </div>
                <code className="block text-[11px] break-all" style={{ color: AMBER }}>
                  {MOCK.address}
                </code>
              </div>
              <div className="mt-3 flex gap-2 text-[10px]">
                <button className="border px-2 py-1 tracking-[0.2em]" style={{ borderColor: GREEN, color: GREEN }}>
                  [COPY]
                </button>
                <button className="border px-2 py-1 tracking-[0.2em]" style={{ borderColor: GREEN_DIM, color: GREEN_DIM }}>
                  [EXPLORER ↗]
                </button>
                <button className="border px-2 py-1 tracking-[0.2em] ml-auto" style={{ borderColor: AMBER, color: AMBER }}>
                  [FAUCET ↗]
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── HISTORY ─────────────────────────────────────────────── */}
        <section className="py-6 border-b border-dashed" style={{ borderColor: GREEN_DIM }}>
          <p style={{ color: GREEN_DIM }} className="text-[10px] tracking-[0.3em] mb-3">
            [07] DECISION·LOG · LAST 5
          </p>
          <div className="space-y-1">
            {MOCK.history.map((h) => (
              <a
                key={h.id}
                href="#"
                className="grid grid-cols-[auto_auto_1fr_auto] gap-x-5 items-baseline py-1.5 hover:bg-[#101510]"
              >
                <span style={{ color: GREEN_DIM }} className="text-[11px] tabular-nums">
                  {new Date(h.createdAt).toISOString().slice(5, 16).replace("T", " ")}
                </span>
                <span
                  className="text-[10px] tracking-[0.2em]"
                  style={{ color: REGIME_COLOR[h.regime] }}
                >
                  {h.regime.toUpperCase().replace("_", "-").padEnd(9, " ")}
                </span>
                <span style={{ color: WHITE }} className="text-[12px] truncate">
                  {h.reasoning}
                </span>
                <span className="text-[10px] tracking-[0.2em]" style={{ color: h.executed ? GREEN : GREEN_DIM }}>
                  {h.executed ? "EXEC" : "PLAN"}
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* ─── FOOTER ──────────────────────────────────────────────── */}
        <footer className="pt-4 flex flex-wrap items-baseline justify-between gap-3 text-[10px] tracking-[0.2em]" style={{ color: GREEN_DIM }}>
          <span>TRAPEZA·TERM · ARC·TESTNET · CHAIN 5042002</span>
          <Link href="/mockups" className="underline" style={{ color: GREEN }}>
            ← BACK TO INDEX
          </Link>
        </footer>
      </div>
    </div>
  );
}

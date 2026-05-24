import Link from "next/link";
import { MOCK } from "../_data";

// === TRAPEZA · BRUTALIST ==========================================
// Swiss grid, loud. Pure white paper, jet-black type, one acid green
// accent. Massive numerals (portfolio value at 192px), microscopic
// captions (10px). Exposed grid lines. Confidence over politeness.
// ==================================================================

const ACID = "#00FF66";
const BLACK = "#000000";

const REGIME_BG: Record<string, string> = {
  risk_on: ACID,
  risk_off: "#FF0044",
  neutral: "#FFEE00",
};

export default function BrutalistMockup() {
  const d = MOCK.latestDecision;
  return (
    <div className="min-h-screen bg-white text-black" style={{ fontFamily: "var(--font-sans)" }}>
      {/* ─── TOP STRIP ─────────────────────────────────────────────── */}
      <div className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-3 border-r border-black py-2 text-[10px] uppercase tracking-[0.25em] font-bold">
            Trapeza ▍ Treasury OS
          </div>
          <div className="col-span-3 border-r border-black py-2 text-[10px] uppercase tracking-[0.25em]">
            {MOCK.user.email}
          </div>
          <div className="col-span-3 border-r border-black py-2 text-[10px] uppercase tracking-[0.25em]">
            Mandate / {MOCK.user.mandate}
          </div>
          <div className="col-span-3 py-2 text-[10px] uppercase tracking-[0.25em] text-right">
            Arc Testnet ▶ 5042002
          </div>
        </div>
      </div>

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 lg:col-span-8 border-r border-black py-10">
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold mb-3">
              01 / Portfolio
            </div>
            <div
              className="font-bold tabular-nums leading-[0.9] tracking-[-0.04em]"
              style={{ fontSize: "clamp(72px, 18vw, 208px)" }}
            >
              ${MOCK.portfolio.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="grid grid-cols-3 gap-x-4 mt-6 pt-4 border-t border-black">
              <Datum label="cirBTC oracle" value={`$${MOCK.prices.cirbtc.toLocaleString()}`} />
              <Datum label="EURC oracle" value={`$${MOCK.prices.eurc.toFixed(3)}`} />
              <Datum label="Source" value={MOCK.prices.source.toUpperCase()} />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 py-10 flex flex-col justify-between gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] font-bold mb-3">
                02 / Regime
              </div>
              <div
                className="font-bold uppercase leading-none px-4 py-5 border-2 border-black"
                style={{ background: REGIME_BG[d.regime], fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: "-0.02em" }}
              >
                {d.regime.replace("_", "-")}
              </div>
              <div className="text-[10px] uppercase tracking-[0.25em] mt-2 font-bold">
                Confidence {(d.confidence * 100).toFixed(0)}%
                {"  /  "}Conviction: HIGH
              </div>
            </div>
            <button
              className="block w-full text-left px-5 py-5 border-2 border-black font-bold uppercase tracking-[0.1em] hover:bg-black hover:text-white transition-colors"
              style={{ fontSize: "20px" }}
            >
              ▶ Run agent now
            </button>
          </div>
        </div>
      </section>

      {/* ─── ALLOCATION ────────────────────────────────────────────── */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 py-10">
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold mb-6">
              03 / Allocation — current vs target
            </div>
            <div className="space-y-6">
              {MOCK.positions.map((p) => (
                <div key={p.symbol} className="grid grid-cols-[120px_1fr_auto] gap-x-6 items-center">
                  <div>
                    <div className="text-2xl font-bold tracking-tight">{p.symbol}</div>
                    <div className="text-[10px] uppercase tracking-[0.2em]">{p.hint}</div>
                  </div>
                  <div className="relative h-12 border-2 border-black bg-white">
                    {/* target marker */}
                    <div
                      className="absolute top-0 bottom-0 w-[2px]"
                      style={{ left: `${p.target * 100}%`, background: BLACK }}
                    >
                      <div
                        className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-widest font-bold whitespace-nowrap"
                      >
                        tgt {(p.target * 100).toFixed(0)}%
                      </div>
                    </div>
                    {/* actual fill */}
                    <div
                      className="absolute top-0 bottom-0 left-0"
                      style={{
                        width: `${p.actual * 100}%`,
                        background: p.symbol === "cirBTC" ? ACID : BLACK,
                      }}
                    />
                    {/* actual label */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-widest font-bold"
                      style={{
                        left: `${Math.min(p.actual, 0.92) * 100}%`,
                        marginLeft: "6px",
                        color: p.symbol === "cirBTC" ? BLACK : BLACK,
                      }}
                    >
                      {(p.actual * 100).toFixed(0)}% / actual
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold tabular-nums">
                      ${p.usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] tabular-nums">
                      {p.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} units
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── REASONING ─────────────────────────────────────────────── */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 lg:col-span-3 border-r border-black py-10 pr-6">
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold mb-4">
              04 / Decision
            </div>
            <div className="text-[11px] uppercase tracking-[0.2em] space-y-1 font-bold">
              <div>{new Date(d.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
              <div>{new Date(d.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
            <div className="mt-8 inline-block px-3 py-2 border-2 border-black text-[10px] uppercase tracking-[0.2em] font-bold" style={{ background: ACID }}>
              ▍ Executed
            </div>
          </div>
          <div className="col-span-12 lg:col-span-9 py-10 lg:pl-6">
            <p className="text-[26px] sm:text-[32px] leading-[1.2] font-medium tracking-tight">
              &ldquo;{d.reasoning}&rdquo;
            </p>
            <div className="mt-8 pt-4 border-t border-black grid sm:grid-cols-3 gap-x-4 gap-y-2 text-[10px] uppercase tracking-[0.2em] font-bold">
              <a href="#" className="hover:underline">
                ▶ Swap tx · arcscan
              </a>
              <a href="#" className="hover:underline">
                ▶ Trace · sha256
              </a>
              <a href="#" className="hover:underline text-right sm:text-left">
                ▶ Full decision detail
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DEPOSIT ───────────────────────────────────────────────── */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 lg:col-span-4 border-r border-black py-10">
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold mb-4">
              05 / Deposit
            </div>
            <div className="size-44 grid grid-cols-8 gap-px border-2 border-black p-1 bg-white">
              {Array.from({ length: 64 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: (i * 7 + i % 5) % 3 === 0 ? BLACK : "transparent",
                  }}
                />
              ))}
            </div>
          </div>
          <div className="col-span-12 lg:col-span-8 py-10 lg:pl-6 space-y-4">
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold">
              Arc Testnet address
            </div>
            <code className="block font-mono text-xl sm:text-2xl break-all border-2 border-black p-4 leading-tight">
              {MOCK.address}
            </code>
            <div className="grid sm:grid-cols-3 gap-3">
              <button className="border-2 border-black px-4 py-3 text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-black hover:text-white">
                ▶ Copy address
              </button>
              <button className="border-2 border-black px-4 py-3 text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-black hover:text-white">
                ▶ View on arcscan
              </button>
              <button
                className="border-2 border-black px-4 py-3 text-[11px] uppercase tracking-[0.2em] font-bold hover:opacity-80"
                style={{ background: ACID }}
              >
                ▶ Faucet.circle.com
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HISTORY ───────────────────────────────────────────────── */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 py-10">
          <div className="text-[10px] uppercase tracking-[0.3em] font-bold mb-6">
            06 / History · last 5 decisions
          </div>
          <div className="border-2 border-black">
            <div className="grid grid-cols-[120px_120px_1fr_80px] text-[10px] uppercase tracking-[0.25em] font-bold border-b-2 border-black bg-black text-white">
              <div className="px-4 py-2">When</div>
              <div className="px-4 py-2 border-l border-white/20">Regime</div>
              <div className="px-4 py-2 border-l border-white/20">Note</div>
              <div className="px-4 py-2 border-l border-white/20 text-right">State</div>
            </div>
            {MOCK.history.map((h, i) => (
              <a
                key={h.id}
                href="#"
                className={`grid grid-cols-[120px_120px_1fr_80px] items-center hover:bg-yellow-50 ${
                  i < MOCK.history.length - 1 ? "border-b border-black" : ""
                }`}
              >
                <div className="px-4 py-3 text-[11px] uppercase tracking-[0.2em] font-bold tabular-nums whitespace-nowrap">
                  {new Date(h.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                  })}
                </div>
                <div className="px-4 py-3 text-[11px] uppercase tracking-[0.2em] font-bold border-l border-black">
                  <span
                    className="inline-block px-1.5 py-0.5 border border-black"
                    style={{ background: REGIME_BG[h.regime] }}
                  >
                    {h.regime.replace("_", "-")}
                  </span>
                </div>
                <div className="px-4 py-3 text-sm border-l border-black truncate">{h.reasoning}</div>
                <div className="px-4 py-3 text-[10px] uppercase tracking-[0.25em] font-bold text-right border-l border-black">
                  {h.executed ? "▍ Exec" : "○ Plan"}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 py-4 flex flex-wrap items-baseline justify-between gap-3 text-[10px] uppercase tracking-[0.25em] font-bold">
          <span>Trapeza ▍ TREASURY OS ▍ ARC TESTNET</span>
          <Link href="/mockups" className="hover:underline">
            ← Back to index
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Datum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.25em] font-bold mb-1">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

import Link from "next/link";
import { MOCK } from "../_data";

// === TRAPEZA · LIQUID GLASS =======================================
// Soft peach-to-lavender gradient, frosted-glass panels, rounded-3xl
// corners, gentle drop shadows. Apple-Vision-OS feel, but warmer.
// Circular ring chart as the allocation hero.
// =================================================================

const REGIME_GRAD: Record<string, string> = {
  risk_on: "from-emerald-400 to-teal-500",
  risk_off: "from-rose-400 to-orange-500",
  neutral: "from-amber-300 to-orange-400",
};

const TOKEN_COLOR = {
  USDC: "#FFB07A",
  EURC: "#A98EFF",
  cirBTC: "#FF6B9C",
} as const;

function RingChart({ segments, size = 220, stroke = 22 }: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="white" strokeOpacity="0.4" strokeWidth={stroke} fill="none" />
      {segments.map((seg) => {
        const frac = seg.value / total;
        const dash = frac * c;
        const el = (
          <circle
            key={seg.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={seg.color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap="butt"
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

export default function GlassMockup() {
  const d = MOCK.latestDecision;
  return (
    <div
      className="min-h-screen text-slate-900"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 15% 0%, #FFE4D0 0%, transparent 50%), radial-gradient(ellipse 70% 60% at 90% 10%, #E5DAFF 0%, transparent 50%), radial-gradient(ellipse 100% 80% at 50% 110%, #FFD9E8 0%, transparent 60%), #FFF6EE",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div className="mx-auto max-w-[1180px] p-6 sm:p-10 space-y-8">
        {/* ─── HEADER ───────────────────────────────────────────────── */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-2xl bg-gradient-to-br from-orange-300 to-pink-400 shadow-lg shadow-pink-300/40" />
            <div>
              <div className="text-xl font-semibold tracking-tight">Trapeza</div>
              <div className="text-[11px] text-slate-500 tracking-wider uppercase">
                Studio · {MOCK.user.mandate}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{MOCK.user.email}</span>
            <button className="px-4 py-2 rounded-full bg-white/70 backdrop-blur-xl border border-white/60 shadow-sm text-sm font-medium hover:bg-white/90">
              Refresh
            </button>
            <button className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-medium shadow-lg shadow-slate-900/20 hover:bg-slate-800">
              Run agent now
            </button>
          </div>
        </header>

        {/* ─── HERO ────────────────────────────────────────────────── */}
        <section className="relative rounded-[32px] bg-white/55 backdrop-blur-2xl border border-white/70 shadow-[0_30px_60px_-15px_rgba(255,150,150,0.25)] overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
          <div className="p-8 sm:p-12 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${REGIME_GRAD[d.regime]} text-white text-xs font-medium shadow-md`}
                >
                  <span className="size-1.5 rounded-full bg-white animate-pulse" />
                  {d.regime.replace("_", "-")} · {(d.confidence * 100).toFixed(0)}%
                </span>
                <span className="text-xs text-slate-500">just now</span>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                  Total value
                </div>
                <div className="text-6xl sm:text-7xl font-semibold tracking-tight tabular-nums bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  ${MOCK.portfolio.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-slate-500 mt-2">
                  cirBTC <span className="font-medium text-slate-700">${MOCK.prices.cirbtc.toLocaleString()}</span>
                  {"  ·  "}
                  EURC <span className="font-medium text-slate-700">${MOCK.prices.eurc.toFixed(3)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                {MOCK.positions.map((p) => (
                  <div
                    key={p.symbol}
                    className="px-3 py-2 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-sm flex items-center gap-2"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ background: TOKEN_COLOR[p.symbol as keyof typeof TOKEN_COLOR] }}
                    />
                    <span className="text-xs font-medium">{p.symbol}</span>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {(p.actual * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <RingChart
                  segments={MOCK.positions.map((p) => ({
                    label: p.symbol,
                    value: p.actual,
                    color: TOKEN_COLOR[p.symbol as keyof typeof TOKEN_COLOR],
                  }))}
                />
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <div className="text-xs uppercase tracking-widest text-slate-500">allocation</div>
                  <div className="text-3xl font-semibold tabular-nums mt-1">
                    {(MOCK.positions[2].actual * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-slate-500">cirBTC dominant</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── REASONING ───────────────────────────────────────────── */}
        <section className="rounded-[32px] bg-white/55 backdrop-blur-2xl border border-white/70 shadow-[0_20px_50px_-15px_rgba(180,150,200,0.22)] p-8 sm:p-10">
          <div className="flex items-baseline justify-between gap-4 mb-5">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500">why this allocation</div>
              <div className="text-sm text-slate-600 mt-1">
                {new Date(d.createdAt).toLocaleString()}
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/60 backdrop-blur text-emerald-700 text-xs font-medium">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Executed
            </span>
          </div>
          <p className="text-[20px] sm:text-[22px] leading-relaxed text-slate-800 font-medium">
            {d.reasoning}
          </p>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <a
              href="#"
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
            >
              <span className="size-1.5 rounded-full bg-pink-400" />
              Swap tx · {d.arcTxHash.slice(0, 10)}…{d.arcTxHash.slice(-4)} ↗
            </a>
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <span className="size-1.5 rounded-full bg-purple-400" />
              Anchored · {d.traceHash.slice(0, 10)}…
            </span>
            <a href="#" className="ml-auto text-slate-700 font-medium hover:text-slate-900">
              Full decision detail →
            </a>
          </div>
        </section>

        {/* ─── POSITIONS + DEPOSIT ─────────────────────────────────── */}
        <section className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          <div className="rounded-[32px] bg-white/55 backdrop-blur-2xl border border-white/70 shadow-[0_20px_50px_-15px_rgba(255,200,170,0.22)] p-8">
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-4">positions</div>
            <ul className="space-y-2">
              {MOCK.positions.map((p) => (
                <li
                  key={p.symbol}
                  className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-4 py-4 rounded-2xl bg-white/40 border border-white/60"
                >
                  <span
                    className="size-3 rounded-full shadow-inner"
                    style={{ background: TOKEN_COLOR[p.symbol as keyof typeof TOKEN_COLOR] }}
                  />
                  <div>
                    <div className="font-semibold">{p.symbol}</div>
                    <div className="text-[11px] text-slate-500 capitalize">{p.hint}</div>
                  </div>
                  <div className="text-right text-sm tabular-nums text-slate-600">
                    {p.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </div>
                  <div className="text-right tabular-nums font-medium text-slate-900 min-w-[100px]">
                    ${p.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[32px] bg-white/55 backdrop-blur-2xl border border-white/70 shadow-[0_20px_50px_-15px_rgba(200,180,255,0.22)] p-8">
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-4">deposit</div>
            <div className="flex items-start gap-4">
              <div className="size-[110px] rounded-2xl bg-white shadow-inner border border-white/80 flex items-center justify-center">
                <div className="size-20 rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 grid grid-cols-5 gap-px p-1">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-[1px]"
                      style={{
                        background: Math.random() > 0.4 ? "white" : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="text-[11px] uppercase tracking-widest text-slate-500">arc address</div>
                <code className="block text-xs font-mono break-all bg-white/50 border border-white/70 px-2 py-1.5 rounded-lg text-slate-700">
                  {MOCK.address}
                </code>
                <div className="flex gap-1.5">
                  <button className="px-3 py-1 rounded-full bg-white/70 border border-white/70 text-xs font-medium hover:bg-white">
                    Copy
                  </button>
                  <button className="px-3 py-1 rounded-full bg-white/40 border border-white/60 text-xs text-slate-600 hover:bg-white/60">
                    Explorer ↗
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-5 p-3 rounded-2xl bg-gradient-to-r from-orange-100/60 to-pink-100/60 text-xs text-slate-600 text-center">
              Get testnet USDC from <span className="font-medium">faucet.circle.com</span>
            </div>
          </div>
        </section>

        {/* ─── HISTORY ─────────────────────────────────────────────── */}
        <section className="rounded-[32px] bg-white/55 backdrop-blur-2xl border border-white/70 shadow-[0_20px_50px_-15px_rgba(200,200,200,0.2)] p-8">
          <div className="flex items-baseline justify-between mb-4">
            <div className="text-xs uppercase tracking-widest text-slate-500">history</div>
            <div className="text-xs text-slate-400">5 prior decisions</div>
          </div>
          <ul className="space-y-1">
            {MOCK.history.map((h) => (
              <li
                key={h.id}
                className="grid grid-cols-[auto_auto_1fr_auto] gap-4 items-baseline px-3 py-3 rounded-xl hover:bg-white/40 cursor-pointer"
              >
                <span className="text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                  {new Date(h.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r ${REGIME_GRAD[h.regime]} text-white text-[10px] font-medium`}
                >
                  {h.regime.replace("_", "-")}
                </span>
                <span className="text-sm text-slate-700 truncate">{h.reasoning}</span>
                <span
                  className={`text-[10px] uppercase tracking-wider ${
                    h.executed ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  {h.executed ? "executed" : "plan"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="flex flex-wrap items-baseline justify-between gap-3 text-xs text-slate-500 px-2">
          <span>Trapeza · Arc Testnet · chainId 5042002</span>
          <Link href="/mockups" className="underline hover:text-slate-900">
            ← Back to design index
          </Link>
        </footer>
      </div>
    </div>
  );
}

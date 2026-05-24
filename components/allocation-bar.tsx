type Weights = { usdc: number; eurc: number; cirbtc: number };

const TOKENS = ["usdc", "eurc", "cirbtc"] as const;
const LABEL = { usdc: "USDC", eurc: "EURC", cirbtc: "cirBTC" } as const;
const HINT = { usdc: "cash · gas", eurc: "safe-FX", cirbtc: "risk" } as const;

// Per-token fill color + whether that fill is "dark" (label needs white).
const FILL = {
  usdc: { bg: "#000000", labelOnFill: "#FFFFFF" },
  eurc: { bg: "#000000", labelOnFill: "#FFFFFF" },
  cirbtc: { bg: "#00FF66", labelOnFill: "#000000" },
} as const;

// Brutalist allocation visual. A row per token, each with a hard-bordered
// bar showing actual fill, a 2px target marker, and tabular numerals on
// either side. The bar gets out of the way of the numbers.
//
// Label color is explicit (white on dark fill, black on acid fill) — the
// earlier mix-blend-mode trick produced unreadable gray-on-green.
export function AllocationBar({
  actual,
  target,
}: {
  actual: Weights;
  target?: Weights;
}) {
  const a = normalize(actual);
  const t = target ? normalize(target) : undefined;

  return (
    <div className="space-y-4">
      {TOKENS.map((k) => {
        const actualPct = a[k];
        const targetPct = t?.[k];
        const fill = FILL[k];
        // Whether the actual fill extends past the label position. If so the
        // label sits on the fill (white/black per fill); otherwise it sits
        // on white paper and stays black.
        const labelStart = Math.min(actualPct, 0.9);
        const labelOnFill = actualPct >= labelStart + 0.02; // label sits inside fill
        return (
          <div
            key={k}
            className="grid grid-cols-[88px_1fr_auto] gap-x-5 items-center"
          >
            <div>
              <div className="text-base font-bold tracking-tight">{LABEL[k]}</div>
              <div className="label-sm text-[color:var(--ink-muted)]">{HINT[k]}</div>
            </div>
            <div className="relative h-9 border-2 border-black bg-white">
              {targetPct !== undefined ? (
                <div
                  className="absolute top-[-12px] bottom-[-12px] w-[2px] bg-black z-10"
                  style={{ left: `${targetPct * 100}%` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 label-sm whitespace-nowrap">
                    tgt {(targetPct * 100).toFixed(0)}
                  </div>
                </div>
              ) : null}
              <div
                className="absolute top-0 bottom-0 left-0"
                style={{
                  width: `${Math.max(0, Math.min(1, actualPct)) * 100}%`,
                  background: fill.bg,
                }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 label-sm pointer-events-none"
                style={{
                  left: `${labelStart * 100}%`,
                  marginLeft: "6px",
                  color: labelOnFill ? fill.labelOnFill : "#000",
                }}
              >
                {(actualPct * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-right ledger label tracking-[0.2em] tabular-nums whitespace-nowrap">
              {targetPct !== undefined
                ? `${(actualPct * 100).toFixed(0)} / ${(targetPct * 100).toFixed(0)}`
                : `${(actualPct * 100).toFixed(0)}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function normalize(w: Weights): Weights {
  const sum = w.usdc + w.eurc + w.cirbtc;
  if (sum <= 0) return { usdc: 1, eurc: 0, cirbtc: 0 };
  return { usdc: w.usdc / sum, eurc: w.eurc / sum, cirbtc: w.cirbtc / sum };
}

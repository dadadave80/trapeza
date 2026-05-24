type Weights = { usdc: number; eurc: number; cirbtc: number };

const COLORS = {
  usdc: "bg-[color:var(--gold)]",
  eurc: "bg-[color:var(--ink-soft)]",
  cirbtc: "bg-[color:var(--oxblood)]",
} as const;

const COLOR_DOTS = {
  usdc: "bg-[color:var(--gold)]",
  eurc: "bg-[color:var(--ink-soft)]",
  cirbtc: "bg-[color:var(--oxblood)]",
} as const;

const LABEL = { usdc: "USDC", eurc: "EURC", cirbtc: "cirBTC" } as const;

// A thin typographic rule split into proportional sections. Below it sits an
// even thinner ghost rule showing the target allocation. This is intentionally
// understated — most of the visual weight lives in the legend below, in
// tabular numerals.
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
      <div className="space-y-1.5">
        <Bar weights={a} thickness={6} />
        {t ? <Bar weights={t} thickness={2} muted /> : null}
        {t ? (
          <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-[color:var(--taupe)] pt-1">
            <span>current</span>
            <span>—— target</span>
          </div>
        ) : null}
      </div>

      <Legend actual={a} target={t} />
    </div>
  );
}

function Bar({
  weights,
  thickness,
  muted,
}: {
  weights: Weights;
  thickness: number;
  muted?: boolean;
}) {
  const keys = ["usdc", "eurc", "cirbtc"] as const;
  return (
    <div
      className="flex w-full overflow-hidden"
      style={{ height: `${thickness}px`, opacity: muted ? 0.4 : 1 }}
    >
      {keys.map((k) => {
        const w = weights[k] * 100;
        if (w <= 0) return null;
        return (
          <div
            key={k}
            className={`${COLORS[k]} transition-all`}
            style={{ width: `${w}%` }}
            title={`${LABEL[k]} ${w.toFixed(1)}%`}
          />
        );
      })}
    </div>
  );
}

function Legend({ actual, target }: { actual: Weights; target?: Weights }) {
  const keys = ["usdc", "eurc", "cirbtc"] as const;
  return (
    <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
      {keys.map((k) => (
        <div key={k} className="flex items-baseline gap-2">
          <span className={`${COLOR_DOTS[k]} inline-block size-1.5 rounded-full translate-y-[-2px]`} />
          <div className="flex-1">
            <div className="font-medium text-[color:var(--ink)] dark:text-[color:var(--ivory)]">
              {LABEL[k]}
            </div>
            <div className="ledger text-xs text-[color:var(--taupe)] tabular-nums">
              {(actual[k] * 100).toFixed(0)}%
              {target ? (
                <span className="text-[color:var(--ink-soft)]"> · {(target[k] * 100).toFixed(0)}% tgt</span>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function normalize(w: Weights): Weights {
  const sum = w.usdc + w.eurc + w.cirbtc;
  if (sum <= 0) return { usdc: 1, eurc: 0, cirbtc: 0 };
  return { usdc: w.usdc / sum, eurc: w.eurc / sum, cirbtc: w.cirbtc / sum };
}

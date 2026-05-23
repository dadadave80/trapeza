type Weights = { usdc: number; eurc: number; cirbtc: number };

const COLORS = {
  usdc: "bg-zinc-400 dark:bg-zinc-500",
  eurc: "bg-sky-500 dark:bg-sky-400",
  cirbtc: "bg-orange-500 dark:bg-orange-400",
} as const;

const LABEL = { usdc: "USDC", eurc: "EURC", cirbtc: "cirBTC" } as const;

// Horizontal stacked bar. If `target` is provided, renders a thin ghost bar
// underneath showing target allocation alongside actual.
export function AllocationBar({
  actual,
  target,
}: {
  actual: Weights;
  target?: Weights;
}) {
  const a = normalize(actual);
  return (
    <div className="space-y-2">
      <Bar weights={a} thick />
      {target ? (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Target
          </div>
          <Bar weights={normalize(target)} />
        </div>
      ) : null}
      <Legend actual={a} target={target ? normalize(target) : undefined} />
    </div>
  );
}

function Bar({ weights, thick = false }: { weights: Weights; thick?: boolean }) {
  const keys = ["usdc", "eurc", "cirbtc"] as const;
  return (
    <div
      className={`flex w-full overflow-hidden rounded-full bg-muted ${thick ? "h-4" : "h-2"}`}
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
    <div className="flex flex-wrap gap-4 text-xs">
      {keys.map((k) => (
        <div key={k} className="flex items-center gap-1.5">
          <span className={`${COLORS[k]} inline-block size-2.5 rounded-sm`} />
          <span className="font-medium">{LABEL[k]}</span>
          <span className="text-zinc-500">
            {(actual[k] * 100).toFixed(0)}%
            {target ? ` → ${(target[k] * 100).toFixed(0)}%` : ""}
          </span>
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

type Weights = { usdc: number; eurc: number; cirbtc: number; usyc: number };

const TOKENS = ["usdc", "usyc", "eurc", "cirbtc"] as const;
const LABEL = {
  usdc: "USDC",
  usyc: "USYC",
  eurc: "EURC",
  cirbtc: "CIRBTC",
} as const;
const HINT = {
  usdc: "cash · gas",
  usyc: "yield · ~10% apy",
  eurc: "safe-fx",
  cirbtc: "risk",
} as const;

// ASCII bar fill — the terminal equivalent of the old hard-bordered bar.
// 40 cells, █ for filled, ░ for empty. Matches the mockup at /mockups/terminal.
const BAR_WIDTH = 40;
function ascii(pct: number): string {
  const filled = Math.max(0, Math.min(BAR_WIDTH, Math.round(pct * BAR_WIDTH)));
  return "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
}

const COLOR: Record<(typeof TOKENS)[number], string> = {
  usdc: "var(--white)",
  usyc: "var(--amber)",
  eurc: "var(--white)",
  cirbtc: "var(--green)",
};

// Terminal allocation visual. A row per token with an ASCII fill bar; if a
// target is provided we render it on a second line beneath, dim-coloured.
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
    <div className="space-y-3 text-[12px] leading-[1.45]">
      {TOKENS.map((k) => {
        const actualPct = a[k];
        const targetPct = t?.[k];
        return (
          <div
            key={k}
            className="grid grid-cols-[88px_1fr_auto] gap-x-4 items-baseline"
          >
            <div className="flex flex-col">
              <span
                className="font-bold tracking-[0.15em]"
                style={{ color: "var(--white)" }}
              >
                {LABEL[k]}
              </span>
              <span className="label-sm normal-case">{HINT[k]}</span>
            </div>
            <div className="space-y-0.5 min-w-0">
              <pre
                className="m-0 whitespace-pre text-[12px] leading-none tabular-nums overflow-hidden"
                style={{ color: COLOR[k] }}
              >
                {ascii(actualPct)}
              </pre>
              {targetPct !== undefined ? (
                <pre
                  className="m-0 whitespace-pre text-[12px] leading-none tabular-nums overflow-hidden opacity-50"
                  style={{ color: "var(--green-dim)" }}
                  aria-label={`Target ${(targetPct * 100).toFixed(0)} percent`}
                >
                  {ascii(targetPct)}
                </pre>
              ) : null}
            </div>
            <div
              className="text-right tabular-nums whitespace-nowrap text-[11px]"
              style={{ color: "var(--green-dim)" }}
            >
              <span style={{ color: "var(--white)" }}>
                {(actualPct * 100).toFixed(1).padStart(5)}%
              </span>
              {targetPct !== undefined ? (
                <>
                  {" / "}
                  <span style={{ color: "var(--amber)" }}>
                    {(targetPct * 100).toFixed(1).padStart(5)}%
                  </span>
                </>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function normalize(w: Weights): Weights {
  const sum = w.usdc + w.eurc + w.cirbtc + w.usyc;
  if (sum <= 0) return { usdc: 1, eurc: 0, cirbtc: 0, usyc: 0 };
  return {
    usdc: w.usdc / sum,
    eurc: w.eurc / sum,
    cirbtc: w.cirbtc / sum,
    usyc: w.usyc / sum,
  };
}

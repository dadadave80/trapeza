type RegimeStyle = {
  label: string;
  bg: string;
  text: string;
  dot: string;
  border: string;
};

const STYLES: Record<string, RegimeStyle> = {
  risk_on: {
    label: "risk-on",
    bg: "bg-[color:var(--sage-soft)]",
    text: "text-[color:var(--sage)]",
    dot: "bg-[color:var(--sage)]",
    border: "border-[color:var(--sage)]/30",
  },
  risk_off: {
    label: "risk-off",
    bg: "bg-[color:var(--oxblood-soft)]",
    text: "text-[color:var(--oxblood)]",
    dot: "bg-[color:var(--oxblood)]",
    border: "border-[color:var(--oxblood)]/30",
  },
  neutral: {
    label: "neutral",
    bg: "bg-[color:var(--gold-soft)]",
    text: "text-[color:var(--gold)]",
    dot: "bg-[color:var(--gold)]",
    border: "border-[color:var(--gold)]/30",
  },
};

const DEFAULT = STYLES.neutral;

export function RegimePill({
  regime,
  size = "md",
  confidence,
}: {
  regime: string;
  size?: "sm" | "md" | "lg";
  confidence?: number;
}) {
  const s = STYLES[regime] ?? DEFAULT;
  const sizing =
    size === "lg"
      ? "px-3.5 py-1.5 text-xs"
      : size === "sm"
        ? "px-2 py-0.5 text-[10px]"
        : "px-2.5 py-1 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-[3px] border font-medium uppercase tracking-[0.18em] ${sizing} ${s.bg} ${s.text} ${s.border}`}
    >
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {s.label}
      {confidence !== undefined ? (
        <span className="opacity-70 font-normal normal-case tracking-normal">
          · {(confidence * 100).toFixed(0)}%
        </span>
      ) : null}
    </span>
  );
}

// A larger, editorial "lockup" rendering of the regime — used in the
// dashboard hero where the regime IS the headline.
export function RegimeLockup({
  regime,
  confidence,
}: {
  regime: string;
  confidence?: number;
}) {
  const s = STYLES[regime] ?? DEFAULT;
  return (
    <span
      className={`inline-flex items-baseline gap-2 ${s.text} font-display italic`}
      style={{
        fontVariationSettings: '"opsz" 72',
        letterSpacing: "-0.02em",
      }}
    >
      <span>{s.label}</span>
      {confidence !== undefined ? (
        <span className="ledger text-xs not-italic opacity-70 tabular-nums">
          {(confidence * 100).toFixed(0)}%
        </span>
      ) : null}
    </span>
  );
}

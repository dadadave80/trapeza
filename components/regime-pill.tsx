const STYLES: Record<string, { ring: string; dot: string; label: string }> = {
  risk_on: {
    ring: "ring-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    label: "risk-on",
  },
  risk_off: {
    ring: "ring-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    dot: "bg-red-500",
    label: "risk-off",
  },
  neutral: {
    ring: "ring-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
    dot: "bg-zinc-500",
    label: "neutral",
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
      ? "px-4 py-1.5 text-sm"
      : size === "sm"
        ? "px-2 py-0.5 text-[11px]"
        : "px-3 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full ring-1 font-medium ${sizing} ${s.ring}`}
    >
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {s.label}
      {confidence !== undefined ? (
        <span className="opacity-70 font-normal">{(confidence * 100).toFixed(0)}%</span>
      ) : null}
    </span>
  );
}

// Terminal regime indicator. Phosphor-coloured text with a `>` prefix, no
// solid backgrounds. Three variants: pill (compact for history rows), lockup
// (oversized for hero callouts), stamp.

const COLOR: Record<string, string> = {
  risk_on: "var(--green)",
  risk_off: "var(--red)",
  neutral: "var(--amber)",
};

const LABEL: Record<string, string> = {
  risk_on: "RISK-ON",
  risk_off: "RISK-OFF",
  neutral: "NEUTRAL",
};

export function RegimePill({
  regime,
  size = "md",
  confidence,
}: {
  regime: string;
  size?: "sm" | "md" | "lg";
  confidence?: number;
}) {
  const padding =
    size === "lg"
      ? "px-2.5 py-1.5 text-[12px]"
      : size === "sm"
        ? "px-1.5 py-0.5 text-[9px]"
        : "px-2 py-1 text-[10px]";
  const color = COLOR[regime] ?? COLOR.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 border uppercase tracking-[0.25em] ${padding}`}
      style={{ color, borderColor: color }}
    >
      <span aria-hidden style={{ color }}>
        &gt;
      </span>
      {LABEL[regime] ?? regime.toUpperCase()}
      {confidence !== undefined ? (
        <span
          className="ledger normal-case tracking-tight"
          style={{ color: "var(--green-dim)" }}
        >
          {(confidence * 100).toFixed(0)}%
        </span>
      ) : null}
    </span>
  );
}

// Hero callout — bigger version, used on dashboard + trace header.
export function RegimeLockup({
  regime,
  confidence,
}: {
  regime: string;
  confidence?: number;
}) {
  const color = COLOR[regime] ?? COLOR.neutral;
  return (
    <div className="space-y-2">
      <div
        className="font-bold uppercase leading-none border px-4 py-3 inline-flex items-baseline gap-3 tracking-[0.2em]"
        style={{
          color,
          borderColor: color,
          fontSize: "clamp(20px, 3vw, 32px)",
        }}
      >
        <span aria-hidden style={{ color }}>
          &gt;
        </span>
        {LABEL[regime] ?? regime.toUpperCase()}
      </div>
      {confidence !== undefined ? (
        <div className="label">CONF {(confidence * 100).toFixed(0)}%</div>
      ) : null}
    </div>
  );
}

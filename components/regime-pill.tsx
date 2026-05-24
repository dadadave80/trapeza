// Brutalist regime indicator — a bordered, colored stamp. Three variants:
// pill (compact for history rows), stamp (mid-size for hero callouts),
// and lockup (oversized for trace headers).

const BG: Record<string, string> = {
  risk_on: "#00FF66",
  risk_off: "#FF0044",
  neutral: "#FFEE00",
};

const FG: Record<string, string> = {
  risk_on: "#000000",
  risk_off: "#000000",
  neutral: "#000000",
};

const LABEL: Record<string, string> = {
  risk_on: "risk-on",
  risk_off: "risk-off",
  neutral: "neutral",
};

function styleFor(regime: string) {
  return {
    background: BG[regime] ?? BG.neutral,
    color: FG[regime] ?? FG.neutral,
  };
}

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
      ? "px-3 py-1.5 text-[12px]"
      : size === "sm"
        ? "px-1.5 py-0.5 text-[9px]"
        : "px-2 py-1 text-[10px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border-2 border-black uppercase tracking-[0.2em] font-bold ${padding}`}
      style={styleFor(regime)}
    >
      {LABEL[regime] ?? regime}
      {confidence !== undefined ? (
        <span className="opacity-70 ledger normal-case tracking-tight">
          {(confidence * 100).toFixed(0)}%
        </span>
      ) : null}
    </span>
  );
}

// Big editorial stamp — used in dashboard hero and trace header.
export function RegimeLockup({
  regime,
  confidence,
}: {
  regime: string;
  confidence?: number;
}) {
  return (
    <div className="space-y-2">
      <div
        className="font-bold uppercase leading-none border-2 border-black px-5 py-5 inline-block tracking-[-0.02em]"
        style={{
          ...styleFor(regime),
          fontSize: "clamp(32px, 5vw, 56px)",
          letterSpacing: "-0.02em",
        }}
      >
        {LABEL[regime] ?? regime}
      </div>
      {confidence !== undefined ? (
        <div className="label">
          Confidence {(confidence * 100).toFixed(0)}%
        </div>
      ) : null}
    </div>
  );
}

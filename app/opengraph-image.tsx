import { ImageResponse } from "next/og";

export const alt = "Trapeza · the money-changer's table, run by an agent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brutalist 1200x630 OG card. Renders the landing headline with the
// brand mark + a stat strip beneath. Generated on demand by Next/og.
export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FFFFFF",
          color: "#000000",
          display: "flex",
          flexDirection: "column",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          letterSpacing: "-0.04em",
        }}
      >
        {/* Top strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "24px 56px",
            borderBottom: "4px solid #000",
            fontSize: 20,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 36,
                height: 36,
                background: "#000",
                color: "#00FF66",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 900,
              }}
            >
              T
            </div>
            <span style={{ letterSpacing: "-0.01em", fontSize: 24 }}>Trapeza</span>
            <span style={{ opacity: 0.5 }}>▍ Treasury OS</span>
          </div>
          <div style={{ opacity: 0.6 }}>Arc Testnet</div>
        </div>

        {/* Headline */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "56px",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 102,
              fontWeight: 900,
              lineHeight: 0.95,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>The money-</span>
            <span>changer&apos;s table,</span>
            <span
              style={{
                background: "#00FF66",
                padding: "0 16px",
                alignSelf: "flex-start",
                display: "flex",
              }}
            >
              run by an agent.
            </span>
          </div>
        </div>

        {/* Bottom stat strip */}
        <div
          style={{
            display: "flex",
            borderTop: "4px solid #000",
          }}
        >
          {[
            ["Chain", "Arc Testnet"],
            ["Settlement", "USDC native"],
            ["Cadence", "*/15 min"],
            ["Agent", "Llama 4 · gpt-oss-120b"],
          ].map(([label, value], i, arr) => (
            <div
              key={label}
              style={{
                flex: 1,
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                borderRight: i < arr.length - 1 ? "1px solid #000" : "none",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  textTransform: "uppercase",
                  letterSpacing: "0.22em",
                  opacity: 0.55,
                  fontWeight: 700,
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}

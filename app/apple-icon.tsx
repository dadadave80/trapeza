import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000000",
          color: "#00FF66",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 156,
          fontWeight: 900,
          letterSpacing: -6,
          lineHeight: 1,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        T
      </div>
    ),
    { ...size },
  );
}

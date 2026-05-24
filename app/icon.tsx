import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Brutalist "T" mark. Black square, acid-green slab serif T, no rounding.
export default function Icon() {
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
          fontSize: 56,
          fontWeight: 900,
          letterSpacing: -2,
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

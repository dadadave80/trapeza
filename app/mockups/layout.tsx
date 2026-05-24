import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design exploration",
  robots: { index: false, follow: false },
};

// Wraps every /mockups/* page with a thin "design exploration" banner so
// stray visitors / judges who land here understand it's not the product.
// The metadata above noindex's the whole subtree.
export default function MockupsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div
        style={{
          background: "#FFEE00",
          borderBottom: "2px solid #000",
          color: "#000",
          padding: "8px 24px",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          fontWeight: 700,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <span>▍ Design exploration · not the live app</span>
        <Link
          href="/portfolio"
          style={{ textDecoration: "underline", textUnderlineOffset: 4 }}
        >
          ▶ Open the real /portfolio
        </Link>
      </div>
      {children}
    </>
  );
}

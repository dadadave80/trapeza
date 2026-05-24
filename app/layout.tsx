import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

// Newsreader (Production Type) — variable optical-size editorial serif.
// Used for headlines, the portfolio value, and pull-quote reasoning.
// Variable-axis font; "variable" weight + opsz axis lets us tune size-aware
// optical sizing via font-variation-settings: "opsz".
const newsreader = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Trapeza — adaptive portfolio agent on Arc",
  description:
    "Trapeza (τράπεζα · the agora's table). An AI agent that rebalances USDC, EURC, and cirBTC on Arc Testnet by the market regime, and pins its reasoning onchain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-[--oxblood] selection:text-[--ivory]">
        {children}
        <Toaster
          theme="light"
          toastOptions={{
            classNames: {
              toast: "!font-sans !bg-card !text-card-foreground !border-border",
            },
          }}
        />
      </body>
    </html>
  );
}

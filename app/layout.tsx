import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://trapeza-gamma.vercel.app",
  ),
  title: {
    default: "TRAPEZA·TERM",
    template: "%s · TRAPEZA·TERM",
  },
  description:
    "Trapeza terminal. A Groq-hosted portfolio agent for USDC, USYC, EURC, and cirBTC on Arc Testnet — every decision pinned onchain.",
  openGraph: {
    title: "TRAPEZA·TERM",
    description:
      "Pick a mandate, fund the wallet, an agent rebalances every 15 minutes on Arc Testnet — hashing its reasoning into a TraceAnchor contract.",
    type: "website",
    url: "/",
    siteName: "Trapeza",
  },
  twitter: {
    card: "summary_large_image",
    title: "TRAPEZA·TERM",
    description:
      "Adaptive portfolio agent on Arc Testnet. Phosphor-green CRT UI. Onchain reasoning anchor.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${mono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "!rounded-none !border !border-[color:var(--green-dim)] !bg-[color:var(--bg-soft)] !text-[color:var(--green)] !font-mono !uppercase !tracking-[0.25em] !text-[11px] !font-normal !shadow-none !p-3",
              title: "!text-[color:var(--white)]",
              description:
                "!text-[color:var(--green-dim)] !normal-case !tracking-normal !text-[11px] !mt-1",
              actionButton:
                "!rounded-none !bg-transparent !text-[color:var(--green)] !border !border-[color:var(--green)] !uppercase !tracking-[0.25em] !text-[10px]",
              cancelButton:
                "!rounded-none !bg-transparent !text-[color:var(--green-dim)] !border !border-[color:var(--green-dim)] !uppercase !tracking-[0.25em] !text-[10px]",
              closeButton:
                "!rounded-none !border !border-[color:var(--green-dim)] !bg-transparent !text-[color:var(--green-dim)] hover:!text-[color:var(--green)] hover:!border-[color:var(--green)] !transition-colors",
              error:
                "!bg-[color:var(--bg-soft)] !text-[color:var(--red)] !border-[color:var(--red)]",
              success:
                "!bg-[color:var(--bg-soft)] !text-[color:var(--green)] !border-[color:var(--green)]",
            },
          }}
        />
      </body>
    </html>
  );
}

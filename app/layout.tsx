import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { GrainField } from "@/components/grain-field";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://trapeza-gamma.vercel.app",
  ),
  title: {
    default: "Trapeza — Treasury OS",
    template: "%s · Trapeza",
  },
  description:
    "The money-changer's table, run by an agent. A Groq-powered portfolio agent that rebalances USDC, EURC, and cirBTC on Arc Testnet by market regime — with every decision pinned onchain.",
  openGraph: {
    title: "Trapeza · the money-changer's table, run by an agent",
    description:
      "Pick a risk profile, deposit USDC, and a Groq-hosted agent rebalances every 15 minutes on Arc Testnet — pinning a sha256 of its reasoning onchain.",
    type: "website",
    url: "/",
    siteName: "Trapeza",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trapeza · the money-changer's table, run by an agent",
    description:
      "Adaptive portfolio agent on Arc. Real onchain swaps. Reasoning hash-pinned for the audit.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-[#00FF66] selection:text-black">
        <GrainField />
        {/* Content sits above the grain canvas (z-0). The hard-bordered
            cards and tables retain their solid surfaces so readability
            is unaffected; the grain reads through gaps and the body bg. */}
        <div className="relative z-10 flex-1 flex flex-col">{children}</div>
        <Toaster
          theme="light"
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "!rounded-none !border-2 !border-black !bg-white !text-black !font-sans !uppercase !tracking-[0.15em] !text-[11px] !font-bold !shadow-none !p-4",
              title: "!text-black !font-bold",
              description: "!text-black/70 !normal-case !tracking-normal !text-[11px] !font-normal !mt-1",
              actionButton:
                "!rounded-none !bg-black !text-white !border-0 !font-bold !uppercase !tracking-[0.15em] !text-[10px]",
              cancelButton:
                "!rounded-none !bg-white !text-black !border-2 !border-black !font-bold !uppercase !tracking-[0.15em] !text-[10px]",
              closeButton:
                "!rounded-none !border-2 !border-black !bg-white !text-black hover:!bg-black hover:!text-white !transition-colors",
              error: "!bg-[#FF0044] !text-white !border-black",
              success: "!bg-[#00FF66] !text-black !border-black",
            },
          }}
        />
      </body>
    </html>
  );
}

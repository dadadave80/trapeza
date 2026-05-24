import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Trapeza — Treasury OS",
  description:
    "Trapeza · the agora's table. A Groq-powered agent that rebalances USDC, EURC, and cirBTC on Arc Testnet by market regime, with every decision pinned onchain.",
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
      <body className="min-h-full flex flex-col bg-white text-black selection:bg-[#00FF66] selection:text-black">
        {children}
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

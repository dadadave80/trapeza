import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-start gap-10 w-full max-w-2xl px-6 py-24 sm:px-10">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Τράπεζα · the agora&apos;s table
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            An adaptive portfolio agent on Arc.
          </h1>
        </div>

        <div className="space-y-5 text-zinc-700 dark:text-zinc-300 text-lg leading-relaxed">
          <p>
            Pick a risk profile, deposit testnet USDC, and a Gemini-powered agent
            rebalances your portfolio across <span className="font-medium">USDC</span>,{" "}
            <span className="font-medium">EURC</span>, and{" "}
            <span className="font-medium">cirBTC</span> every 15 minutes.
          </p>
          <p>
            It classifies the market regime, decides target weights inside your
            goal bands, executes the swap onchain via Circle App Kit, and pins a
            hash of its reasoning to Arc so every decision is verifiable.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/onboard" className={buttonVariants({ size: "lg" })}>
            Get started →
          </Link>
          <a
            href="https://github.com/circlefin/skills"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "ghost", size: "lg" })}
          >
            How it works
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-8">
          <Stat label="Chain" value="Arc Testnet" />
          <Stat label="Native gas" value="USDC" />
          <Stat label="Cadence" value="*/15 min" />
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white dark:bg-zinc-900 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-base font-medium mt-1">{value}</div>
    </div>
  );
}

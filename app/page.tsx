import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-black">
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 sm:px-10">
        <section className="pt-24 pb-16 space-y-10">
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
              Pick a risk profile, deposit testnet USDC, and a Gemini-powered
              agent rebalances your portfolio across{" "}
              <span className="font-medium">USDC</span>,{" "}
              <span className="font-medium">EURC</span>, and{" "}
              <span className="font-medium">cirBTC</span> every 15 minutes.
            </p>
            <p>
              It classifies the market regime, decides target weights inside
              your goal bands, executes the swap onchain via Circle App Kit,
              and pins a SHA-256 hash of its reasoning to Arc so every
              decision is independently verifiable.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/onboard" className={buttonVariants({ size: "lg" })}>
              Get started →
            </Link>
            <Link
              href="/portfolio"
              className={buttonVariants({ variant: "ghost", size: "lg" })}
            >
              I&apos;m already in
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            <Stat label="Chain" value="Arc Testnet" />
            <Stat label="Native gas" value="USDC" />
            <Stat label="Cadence" value="*/15 min" />
          </div>
        </section>

        <section className="border-t border-border pt-12 pb-20 space-y-6">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            How it works
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <Step
              n="01"
              title="Pick a goal"
              body="Conservative, Balanced, or Aggressive sets the bands the agent must respect on every rebalance."
            />
            <Step
              n="02"
              title="Deposit USDC"
              body="A Circle developer-controlled SCA wallet is minted on Arc Testnet. Fund it from faucet.circle.com."
            />
            <Step
              n="03"
              title="Watch the agent run"
              body="Gemini Flash classifies regime, Gemini Pro decides weights, App Kit swaps, and the trace hash is pinned to Arc."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 px-6 sm:px-10">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          <span>
            Built for the Agora Agents Hackathon (Canteen × Circle) · RFB-04
          </span>
          <a
            href="https://github.com/circlefin/skills"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto underline hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Circle Skills
          </a>
          <a
            href="https://docs.arc.network"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Arc docs
          </a>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white dark:bg-zinc-900 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-base font-medium mt-1 font-mono">{value}</div>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-white dark:bg-zinc-900 p-5 space-y-2">
      <div className="text-xs font-mono text-zinc-400 tabular-nums">{n}</div>
      <div className="font-medium">{title}</div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        {body}
      </p>
    </div>
  );
}

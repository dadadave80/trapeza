import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Masthead */}
      <header className="border-b border-[color:var(--ink)] dark:border-[color:var(--ivory)]/30">
        <div className="mx-auto max-w-[1080px] px-6 sm:px-10 py-5 flex items-baseline justify-between gap-6">
          <Link href="/" className="flex items-baseline gap-3">
            <span
              className="font-display text-[28px] tracking-tight text-[color:var(--ink)] dark:text-[color:var(--ivory)]"
              style={{ fontVariationSettings: '"opsz" 36' }}
            >
              Trapeza
            </span>
            <span className="kicker hidden sm:inline">
              Τράπεζα · the agora&apos;s table
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/onboard"
              className="kicker-ink underline underline-offset-4 decoration-[color:var(--stone)] hover:decoration-[color:var(--ink)]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-[1080px] px-6 sm:px-10 py-16 sm:py-24">
        {/* Cover */}
        <section className="grid lg:grid-cols-[1.5fr_1fr] gap-x-12 gap-y-10 items-end">
          <div>
            <p className="kicker mb-6">
              No. 01 · An adaptive portfolio agent · Arc Testnet
            </p>
            <h1
              className="display text-[56px] sm:text-[88px] lg:text-[112px] text-[color:var(--ink)] dark:text-[color:var(--ivory)]"
              style={{ fontVariationSettings: '"opsz" 144' }}
            >
              The money-changer&apos;s
              <br />
              <span className="display-italic text-[color:var(--oxblood)]">
                table,
              </span>{" "}
              now run by
              <br />
              an agent.
            </h1>
          </div>

          <aside className="space-y-6 lg:pl-10 lg:border-l lg:border-[color:var(--stone)]">
            <p className="lede text-[19px] text-[color:var(--ink-soft)] dark:text-[color:var(--taupe)]">
              Pick a risk profile. Deposit testnet USDC. A Gemini agent reads
              the market every fifteen minutes, decides weights inside your
              bands, settles the rebalance through Circle App Kit on Arc, and
              pins a SHA-256 hash of its reasoning onchain.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/onboard"
                className={buttonVariants({ size: "lg" })}
                style={{ borderRadius: "3px" }}
              >
                Start →
              </Link>
              <Link
                href="#how"
                className={buttonVariants({ variant: "ghost", size: "lg" })}
                style={{ borderRadius: "3px" }}
              >
                Read more
              </Link>
            </div>
          </aside>
        </section>

        <hr className="rule mt-16" />

        {/* Three principles, presented as editorial articles */}
        <section id="how" className="mt-14 grid gap-x-12 gap-y-12 md:grid-cols-3">
          <Article
            n="I"
            title="A risk mandate, in three words."
            body="Conservative, Balanced, or Aggressive: each defines the floor and ceiling the agent must respect on every rebalance. The bands are hard constraints — Gemini cannot wander past them, no matter how loud the market gets."
          />
          <Article
            n="II"
            title="Custody by Circle, settled on Arc."
            body="On goal selection we mint a developer-controlled SCA wallet on Arc Testnet via @circle-fin/developer-controlled-wallets. Fund it from faucet.circle.com. USDC is Arc's native gas token, so the agent never needs to hold ETH."
          />
          <Article
            n="III"
            title="Reasoning that survives the audit."
            body="Gemini 3 Flash classifies the regime; 3.1 Pro decides the weights and writes a plain-English memo. Both the memo and the resulting swap are sha256-hashed and pinned to a TraceAnchor contract — a footnote you can verify on testnet.arcscan.app."
          />
        </section>

        <hr className="rule mt-16" />

        {/* Stat strip */}
        <section className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6">
          <Stat label="Chain" value="Arc Testnet" />
          <Stat label="Settlement" value="USDC native" />
          <Stat label="Rebalance" value="every 15 min" />
          <Stat label="Models" value="Gemini 3 · 3.1" />
        </section>
      </main>

      <footer className="border-t border-[color:var(--stone)] mt-20">
        <div className="mx-auto max-w-[1080px] px-6 sm:px-10 py-6 flex flex-wrap items-baseline justify-between gap-3 text-xs">
          <span className="kicker">
            Built for the Agora Agents Hackathon · Canteen × Circle · RFB-04
          </span>
          <div className="flex gap-5">
            <a
              href="https://docs.arc.network"
              target="_blank"
              rel="noopener noreferrer"
              className="kicker-ink underline underline-offset-4 decoration-[color:var(--stone)] hover:decoration-[color:var(--ink)]"
            >
              Arc docs
            </a>
            <a
              href="https://developers.circle.com"
              target="_blank"
              rel="noopener noreferrer"
              className="kicker-ink underline underline-offset-4 decoration-[color:var(--stone)] hover:decoration-[color:var(--ink)]"
            >
              Circle docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Article({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <article className="space-y-3">
      <div className="flex items-baseline gap-3">
        <span
          className="display-italic text-[color:var(--oxblood)] text-2xl"
          aria-hidden
        >
          §{n}
        </span>
        <span className="kicker">Principle</span>
      </div>
      <h3
        className="display text-2xl text-[color:var(--ink)] dark:text-[color:var(--ivory)]"
        style={{ fontVariationSettings: '"opsz" 28' }}
      >
        {title}
      </h3>
      <p className="text-[15px] leading-relaxed text-[color:var(--ink-soft)] dark:text-[color:var(--taupe)]">
        {body}
      </p>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="kicker mb-1">{label}</div>
      <div
        className="font-display text-xl text-[color:var(--ink)] dark:text-[color:var(--ivory)]"
        style={{ fontVariationSettings: '"opsz" 24' }}
      >
        {value}
      </div>
    </div>
  );
}

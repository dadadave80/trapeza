import Link from "next/link";

const MOCKS = [
  {
    slug: "terminal",
    name: "Terminal",
    tagline: "Bloomberg, but uglier and prouder of it.",
    vibe: "phosphor green · all-caps · dense grid · for users who think Bloomberg looks overdesigned",
    palette: ["#0A0E08", "#A5F584", "#FFC857"],
  },
  {
    slug: "glass",
    name: "Liquid Glass",
    tagline: "Apple-Vision-OS in your treasury app.",
    vibe: "soft peach gradient · frosted cards · rounded-3xl · circular ring chart · gentle motion",
    palette: ["#FFE5CC", "#E0D5FF", "#1A1A2E"],
  },
  {
    slug: "brutalist",
    name: "Brutalist",
    tagline: "Your money is loud. Set it in 200pt.",
    vibe: "Swiss grid · pure white + jet black + one acid accent · massive numerals · tiny captions",
    palette: ["#FFFFFF", "#000000", "#00FF66"],
  },
] as const;

export default function MockupsIndex() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-[color:var(--ink)] dark:border-[color:var(--ivory)]/30">
        <div className="mx-auto max-w-[1080px] px-6 sm:px-10 py-5 flex items-baseline justify-between gap-6">
          <Link href="/" className="flex items-baseline gap-3">
            <span
              className="font-display text-[28px] tracking-tight"
              style={{ fontVariationSettings: '"opsz" 36' }}
            >
              Trapeza
            </span>
            <span className="kicker hidden sm:inline">design exploration</span>
          </Link>
          <Link
            href="/portfolio"
            className="kicker-ink underline underline-offset-4 decoration-[color:var(--stone)] hover:decoration-[color:var(--ink)]"
          >
            Current production →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-6 sm:px-10 py-16 space-y-12">
        <div className="space-y-3 max-w-3xl">
          <p className="kicker">Three directions · live mockups</p>
          <h1
            className="display text-[44px] sm:text-[60px]"
            style={{ fontVariationSettings: '"opsz" 72' }}
          >
            Pick the world Trapeza
            <br />
            should live in.
          </h1>
          <p className="lede text-[19px] text-[color:var(--ink-soft)] dark:text-[color:var(--taupe)]">
            Three aesthetic explorations of the dashboard, rendered against the
            same mock portfolio. Open each, scroll, decide. The winner gets
            promoted to the real <code className="ledger">/portfolio</code>.
          </p>
        </div>

        <hr className="rule" />

        <ul className="space-y-4">
          {MOCKS.map((m, i) => (
            <li key={m.slug}>
              <Link
                href={`/mockups/${m.slug}`}
                className="block group border border-[color:var(--stone)] hover:border-[color:var(--ink)] dark:hover:border-[color:var(--ivory)] transition-colors p-6 sm:p-8"
              >
                <div className="grid sm:grid-cols-[auto_1fr_auto] gap-6 items-center">
                  <div
                    className="display-italic text-[color:var(--oxblood)] text-5xl tabular-nums"
                    aria-hidden
                  >
                    §{i + 1}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <h2
                        className="display text-3xl"
                        style={{ fontVariationSettings: '"opsz" 36' }}
                      >
                        {m.name}
                      </h2>
                      <span className="kicker">{m.tagline}</span>
                    </div>
                    <p className="text-[15px] text-[color:var(--ink-soft)] dark:text-[color:var(--taupe)] leading-relaxed">
                      {m.vibe}
                    </p>
                    <div className="flex gap-1.5 pt-1">
                      {m.palette.map((c) => (
                        <span
                          key={c}
                          className="size-4 rounded-sm border border-[color:var(--stone)]"
                          style={{ background: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="kicker-ink whitespace-nowrap group-hover:translate-x-1 transition-transform">
                    Open →
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <hr className="rule" />

        <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4 text-sm">
          <div>
            <p className="kicker-ink mb-2">What&apos;s included in every mockup</p>
            <ul className="list-disc pl-5 space-y-1 text-[color:var(--ink-soft)] dark:text-[color:var(--taupe)]">
              <li>Brand wordmark + mandate ribbon</li>
              <li>Portfolio total ($) + cirBTC and EURC oracle prices</li>
              <li>Regime indicator (risk-on shown)</li>
              <li>Current vs target allocation</li>
              <li>Agent reasoning, with executed badge + onchain links</li>
              <li>Positions table (units + USD value)</li>
              <li>Deposit interface (address + QR placeholder)</li>
              <li>Decision history with regime + executed state</li>
            </ul>
          </div>
          <div>
            <p className="kicker-ink mb-2">How to evaluate</p>
            <p className="text-[color:var(--ink-soft)] dark:text-[color:var(--taupe)] leading-relaxed">
              Imagine you&apos;re a hackathon judge spending 90 seconds on each
              screen. Which one makes you trust the agent fastest? Which one
              would you screenshot and send to a friend? Which one makes the
              Greek-banking name and the onchain anchor feel inevitable?
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

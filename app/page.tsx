import Link from "next/link";
import { ARC_DISPLAY } from "@/lib/constants";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Top strip */}
      <header
        className="border-b border-dashed"
        style={{ borderColor: "var(--green-dim)" }}
      >
        <div className="mx-auto max-w-[1180px] px-5 py-3 grid grid-cols-[1fr_auto] items-center gap-4">
          <Link
            href="/"
            className="flex items-baseline gap-4 min-w-0"
            aria-label="Trapeza terminal home"
          >
            <span
              className="text-base font-bold tracking-[0.3em]"
              style={{ color: "var(--amber)" }}
            >
              TRAPEZA·TERM
            </span>
            <span className="text-[11px] text-[color:var(--green-dim)] truncate hidden sm:inline">
              v0.5.0 · ARC-TESTNET · 5042002 · USDC-NATIVE GAS
            </span>
          </Link>
          <Link
            href="/onboard"
            className="text-[11px] tracking-[0.25em] uppercase hover:underline"
            style={{ color: "var(--green)" }}
          >
            [LOGIN ↗]
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-5">
        {/* HERO */}
        <section
          className="py-10 lg:py-14 grid grid-cols-12 gap-6 border-b border-dashed"
          style={{ borderColor: "var(--green-dim)" }}
        >
          <div className="col-span-12 lg:col-span-8">
            <p className="section-marker mb-4">[01] ADAPTIVE·PORTFOLIO·AGENT</p>
            <h1
              className="font-bold tracking-[-0.02em] leading-[0.9]"
              style={{
                fontSize: "clamp(40px, 8vw, 96px)",
                color: "var(--white)",
              }}
            >
              <span style={{ color: "var(--green-dim)" }}>&gt; </span>
              THE MONEY-
              <br />
              CHANGER&apos;S TABLE,
              <br />
              <span
                className="inline-block px-3 -ml-1"
                style={{
                  background: "var(--green)",
                  color: "var(--bg)",
                }}
              >
                RUN BY AN AGENT.
              </span>
              <span className="cursor-blink" aria-hidden />
            </h1>

            <div
              className="mt-8 pt-4 border-t border-dashed grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3"
              style={{ borderColor: "var(--green-dim)" }}
            >
              <Stat label="CHAIN" value="ARC TESTNET" />
              <Stat label="SETTLEMENT" value="USDC NATIVE" />
              <Stat label="CADENCE" value="*/15 MIN" />
              <Stat label="MODELS" value="GROQ · LLAMA 4" />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <p
              className="text-[14px] leading-[1.6]"
              style={{ color: "var(--white)" }}
            >
              <span style={{ color: "var(--green)" }}>&gt;</span> Pick a risk
              mandate. Fund the wallet. A Groq-hosted agent reads the market
              every fifteen minutes, decides weights inside hard bands, settles
              the rebalance through Circle DCW, and pins a SHA-256 of its
              reasoning to a TraceAnchor contract on Arc.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/onboard"
                className="btn-acid text-center !text-[12px] !py-3"
              >
                [START NOW ↗]
              </Link>
              <Link href="/demo" className="btn text-center !text-[12px] !py-3">
                [PREVIEW DEMO]
              </Link>
              <a href="#how" className="btn text-center !text-[12px] !py-3">
                [HOW IT WORKS]
              </a>
            </div>
          </div>
        </section>

        {/* THREE PRINCIPLES */}
        <section
          id="how"
          className="py-6 border-b border-dashed"
          style={{ borderColor: "var(--green-dim)" }}
        >
          <p className="section-marker mb-4">[02] PRINCIPLES</p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-px">
            <Principle
              n="I"
              title="A risk mandate in three words."
              body="Conservative, Balanced, or Aggressive sets the floors and ceiling the agent must respect on every rebalance. Four-asset basket — USDC, USYC yield, EURC, cirBTC — with bands hard-clamped server-side. The model cannot wander past them."
            />
            <Principle
              n="II"
              title="Custody by Circle, settled on Arc."
              body="On mandate selection we mint a developer-controlled SCA wallet on Arc Testnet via @circle-fin/developer-controlled-wallets. In-app faucet for mock tokens; faucet.circle.com for canonical assets. USDC is Arc's native gas."
            />
            <Principle
              n="III"
              title="Reasoning that survives the audit."
              body="Llama 4 Scout classifies the regime; gpt-oss-120b decides weights + writes a plain-English memo. Memo + decision sha256-hashed and pinned to a TraceAnchor contract. Verifiable on testnet.arcscan.app."
            />
          </div>
        </section>

        {/* FOOTER STRIP */}
        <footer className="py-4 grid grid-cols-12 gap-4 label">
          <span className="col-span-12 sm:col-span-6">
            BUILT FOR THE AGORA AGENTS HACKATHON · CANTEEN × CIRCLE · RFB-04
          </span>
          <a
            href="https://docs.arc.network"
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-6 sm:col-span-3 hover:text-[color:var(--green)]"
          >
            [ARC DOCS ↗]
          </a>
          <a
            href="https://developers.circle.com"
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-6 sm:col-span-3 hover:text-[color:var(--green)]"
          >
            [CIRCLE DOCS ↗]
          </a>
        </footer>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <div
        className="text-[13px] font-bold tabular-nums tracking-[0.1em]"
        style={{ color: "var(--white)" }}
      >
        {value}
      </div>
    </div>
  );
}

function Principle({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <article
      className="p-5 border"
      style={{
        borderColor: "var(--green-dim)",
        background: "var(--bg-soft)",
      }}
    >
      <div
        className="font-bold inline-block px-2 mb-3 text-[24px] leading-none tracking-[0.15em]"
        style={{ background: "var(--green)", color: "var(--bg)" }}
      >
        §{n}
      </div>
      <h3
        className="text-[14px] font-bold uppercase tracking-[0.15em] leading-tight mb-2"
        style={{ color: "var(--white)" }}
      >
        {title}
      </h3>
      <p
        className="text-[13px] leading-relaxed"
        style={{ color: "var(--green-dim)" }}
      >
        {body}
      </p>
    </article>
  );
}

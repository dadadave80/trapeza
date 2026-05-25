import Link from "next/link";
import { ARC_DISPLAY } from "@/lib/constants";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col bg-white text-black">
      {/* Top strip — same masthead vocabulary as the rest of the app */}
      <header className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-3 border-r border-black py-3 label-lg flex items-center">
            <span className="text-base font-bold tracking-tight">Trapeza</span>
            <span className="ml-2 hidden sm:inline opacity-60">▍ Treasury OS</span>
          </div>
          <div className="col-span-3 border-r border-black py-3 label hidden sm:flex items-center">
            v0.4.0 / {ARC_DISPLAY.name}
          </div>
          <div className="col-span-3 border-r border-black py-3 label hidden md:flex items-center">
            {ARC_DISPLAY.chainId} / USDC-native gas
          </div>
          <div className="col-span-3 py-3 flex items-center justify-end label">
            <Link href="/onboard" className="hover:underline">
              ▶ Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 lg:col-span-8 border-r border-black py-12 lg:py-20 lg:pr-6">
            <div className="label mb-4">No. 01 / Adaptive portfolio agent</div>
            <h1
              className="font-bold tracking-[-0.04em] leading-[0.88]"
              style={{ fontSize: "clamp(56px, 11vw, 168px)" }}
            >
              The money-
              <br />
              changer&apos;s table,
              <br />
              <span
                className="inline-block px-3 -ml-1"
                style={{ background: "#00FF66" }}
              >
                run by an agent.
              </span>
            </h1>
            <div className="mt-10 pt-5 border-t border-black grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4">
              <Stat label="Chain" value="Arc Testnet" />
              <Stat label="Settlement" value="USDC native" />
              <Stat label="Cadence" value="*/15 min" />
              <Stat label="Models" value="Groq · Llama 4" />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 py-12 lg:py-20 lg:pl-6 flex flex-col gap-8">
            <p className="text-[19px] sm:text-[22px] leading-[1.35] font-medium tracking-tight">
              Pick a risk profile. Deposit testnet USDC. A Groq-hosted agent
              reads the market every fifteen minutes, decides weights inside
              your bands, settles the rebalance through Circle App Kit, and
              pins a SHA-256 hash of its reasoning to Arc.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/onboard" className="btn-acid w-full text-base !py-4">
                ▶ Start now
              </Link>
              <Link href="#how" className="btn w-full">
                ▢ How it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* THREE PRINCIPLES */}
      <section id="how" className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="label py-5 border-b border-black">02 / Principles</div>
          <div className="grid grid-cols-1 lg:grid-cols-3">
            <Principle
              n="I"
              title="A risk mandate in three words."
              body="Conservative, Balanced, or Aggressive sets the floor and ceiling the agent must respect on every rebalance. The bands are hard constraints — the model cannot wander past them, no matter how loud the market gets."
              right
              bottom
            />
            <Principle
              n="II"
              title="Custody by Circle, settled on Arc."
              body="On goal selection we mint a developer-controlled SCA wallet on Arc Testnet via @circle-fin/developer-controlled-wallets. Fund it from faucet.circle.com. USDC is Arc's native gas — no ETH required."
              right
              bottom
            />
            <Principle
              n="III"
              title="Reasoning that survives the audit."
              body="Llama 4 classifies the regime, gpt-oss-120b decides the weights and writes a plain-English memo. Both the memo and the swap are sha256-hashed and pinned to a TraceAnchor contract — a footnote you can verify on testnet.arcscan.app."
              bottom
            />
          </div>
        </div>
      </section>

      {/* FOOTER STRIP */}
      <footer className="mt-auto border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 sm:col-span-6 border-r border-black py-4 label">
            Built for the Agora Agents Hackathon ▍ Canteen × Circle ▍ RFB-04
          </div>
          <div className="col-span-6 sm:col-span-3 border-r border-black py-4 label">
            <a href="https://docs.arc.network" target="_blank" rel="noopener noreferrer" className="hover:underline">
              ▶ Arc docs
            </a>
          </div>
          <div className="col-span-6 sm:col-span-3 py-4 label">
            <a href="https://developers.circle.com" target="_blank" rel="noopener noreferrer" className="hover:underline">
              ▶ Circle docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <div className="text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Principle({
  n,
  title,
  body,
  right,
  bottom,
}: {
  n: string;
  title: string;
  body: string;
  right?: boolean;
  bottom?: boolean;
}) {
  return (
    <article
      className={`p-8 lg:p-10 ${right ? "lg:border-r lg:border-black" : ""} ${
        bottom ? "border-b lg:border-b-0 border-black" : ""
      }`}
    >
      <div
        className="font-bold inline-block px-2 -ml-1 mb-4"
        style={{ background: "#00FF66", fontSize: "44px", lineHeight: 1 }}
      >
        §{n}
      </div>
      <h3 className="text-2xl font-bold tracking-tight leading-tight mb-3">
        {title}
      </h3>
      <p className="text-[15px] leading-relaxed">{body}</p>
    </article>
  );
}

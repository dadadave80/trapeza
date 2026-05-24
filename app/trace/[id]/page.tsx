import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { supabaseServer, supabaseService } from "@/lib/db/client";
import { AllocationBar } from "@/components/allocation-bar";
import { RegimePill } from "@/components/regime-pill";
import { Masthead } from "@/components/masthead";
import type { Signals, TargetWeights } from "@/lib/types";

export const dynamic = "force-dynamic";

type DecisionDetail = {
  id: string;
  created_at: string;
  regime: string;
  signals: Signals;
  target_weights: TargetWeights;
  prev_weights: TargetWeights | null;
  reasoning: string;
  alerts: string[];
  trace_hash: string | null;
  arc_tx_hash: string | null;
  circle_tx_id: string | null;
  executed: boolean;
};

export default async function TracePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/onboard");

  const svc = supabaseService();
  const { data: d } = await svc
    .from("decisions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<DecisionDetail>();

  if (!d) notFound();

  const s = d.signals;
  const dateline = new Date(d.created_at).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex-1">
      <Masthead
        right={
          <Link href="/portfolio" className="hover:underline whitespace-nowrap">
            ← Portfolio
          </Link>
        }
      />

      {/* HEADER */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 lg:col-span-8 border-r border-black py-12 lg:pr-6">
            <div className="label mb-3">Decision · {dateline}</div>
            <h1
              className="font-bold tracking-[-0.04em] leading-[0.9]"
              style={{ fontSize: "clamp(56px, 11vw, 144px)" }}
            >
              Why this
              <br />
              <span className="inline-block px-3 -ml-1" style={{ background: "#00FF66" }}>
                allocation?
              </span>
            </h1>
          </div>
          <div className="col-span-12 lg:col-span-4 py-12 lg:pl-6 flex flex-col gap-4 justify-end">
            <RegimePill regime={d.regime} size="lg" />
            <span
              className="inline-block w-fit border-2 border-black px-2 py-1 label"
              style={{ background: d.executed ? "#00FF66" : "#FFFFFF" }}
            >
              {d.executed ? "▍ Executed" : "○ Plan only"}
            </span>
          </div>
        </div>
      </section>

      {/* PULL QUOTE */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 lg:col-span-3 border-r border-black py-12 lg:pr-6">
            <div className="label mb-4">01 / Memo</div>
            <div className="label opacity-60">— Trapeza on Groq</div>
          </div>
          <div className="col-span-12 lg:col-span-9 py-12 lg:pl-6">
            <p className="text-[26px] sm:text-[34px] leading-[1.2] font-medium tracking-tight">
              &ldquo;{d.reasoning}&rdquo;
            </p>
            {d.alerts?.length ? (
              <ul className="mt-8 border-l-2 border-[color:var(--red)] pl-4 space-y-1">
                {d.alerts.map((a, i) => (
                  <li key={i} className="text-sm" style={{ color: "var(--red)" }}>
                    ⚠︎ {a}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      {/* TARGET ALLOCATION + SIGNALS */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 lg:col-span-7 border-r border-black py-10 lg:pr-6">
            <div className="label mb-6">02 / Target allocation</div>
            <AllocationBar
              actual={d.target_weights}
              target={d.prev_weights ?? undefined}
            />
            {d.prev_weights ? (
              <p className="label mt-5 opacity-70 normal-case tracking-wider">
                Acid fill = target. Target marker (▏) = weights at decision time.
              </p>
            ) : null}
          </div>
          <div className="col-span-12 lg:col-span-5 py-10 lg:pl-6">
            <div className="label mb-6">03 / Signals snapshot</div>
            <dl className="border-2 border-black">
              <Sig label="BTC 24h" value={`${s.btc_24h_change.toFixed(2)}%`} />
              <Sig label="ETH 24h" value={`${s.eth_24h_change.toFixed(2)}%`} />
              <Sig label="BTC vol" value={`${s.btc_realized_vol.toFixed(2)}%`} />
              <Sig label="USDC" value={`$${s.usdc_price.toFixed(4)}`} />
              <Sig label="USDT" value={`$${s.usdt_price.toFixed(4)}`} />
              <Sig
                label="Fetched"
                value={new Date(s.fetched_at).toLocaleTimeString()}
                last
              />
            </dl>
          </div>
        </div>
      </section>

      {/* ONCHAIN FOOTNOTE */}
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <div className="label mb-5">04 / Onchain footnote</div>
          <p className="text-sm max-w-prose mb-6">
            The reasoning above was serialised, SHA-256 hashed, and pinned to
            the TraceAnchor contract on Arc. The swap (if any) was settled
            through Circle App Kit via a developer-controlled SCA wallet.
          </p>
          <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
            <div>
              <div className="label mb-2">Trace hash · sha256</div>
              <code className="block break-all font-mono text-sm border-2 border-black p-4">
                {d.trace_hash ?? "—"}
              </code>
            </div>
            <div className="flex flex-col gap-3">
              {d.arc_tx_hash ? (
                <a
                  href={`https://testnet.arcscan.app/tx/${d.arc_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                >
                  ▶ Swap tx on arcscan
                </a>
              ) : null}
              {d.circle_tx_id ? (
                <div className="border-2 border-black p-3">
                  <div className="label mb-1">Circle tx id</div>
                  <div className="ledger text-xs break-all opacity-70">
                    {d.circle_tx_id}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="mx-auto max-w-[1280px] px-6 py-4 flex flex-wrap items-baseline justify-between gap-3 label">
          <span>Trapeza ▍ Treasury OS ▍ Arc Testnet · chainId 5042002</span>
          <Link href="/portfolio" className="hover:underline">
            ← Back to portfolio
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Sig({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto] items-center px-4 py-3 ${
        !last ? "border-b border-black" : ""
      }`}
    >
      <dt className="label">{label}</dt>
      <dd className="ledger tabular-nums font-bold">{value}</dd>
    </div>
  );
}

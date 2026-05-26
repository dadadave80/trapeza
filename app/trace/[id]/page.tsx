import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { supabaseServer, supabaseService } from "@/lib/db/client";
import { AllocationBar } from "@/components/allocation-bar";
import { RegimePill } from "@/components/regime-pill";
import { Masthead } from "@/components/masthead";
import type { Signals, TargetWeights } from "@/lib/types";
import { ARC_DISPLAY } from "@/lib/constants";

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
  const dateline = new Date(d.created_at)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");

  return (
    <div className="flex-1">
      <Masthead
        right={
          <Link
            href="/portfolio"
            className="text-[color:var(--green-dim)] hover:text-[color:var(--green)] tracking-[0.25em] uppercase whitespace-nowrap"
          >
            [← PORTFOLIO]
          </Link>
        }
      />

      <div className="mx-auto max-w-[1180px] px-5">
        {/* HEADER */}
        <section
          className="py-6 border-b border-dashed grid grid-cols-12 gap-6"
          style={{ borderColor: "var(--green-dim)" }}
        >
          <div className="col-span-12 lg:col-span-8">
            <p className="section-marker mb-3">
              [DECISION] · {dateline}Z
            </p>
            <h1
              className="font-bold tracking-[-0.02em] leading-[0.92]"
              style={{
                fontSize: "clamp(36px, 8vw, 88px)",
                color: "var(--white)",
              }}
            >
              <span style={{ color: "var(--green-dim)" }}>&gt; </span>
              WHY THIS
              <br />
              <span
                className="inline-block px-2"
                style={{ background: "var(--green)", color: "var(--bg)" }}
              >
                ALLOCATION?
              </span>
            </h1>
          </div>
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-3 justify-end">
            <RegimePill regime={d.regime} size="lg" />
            <span
              className="inline-flex w-fit items-center gap-1.5 border px-2 py-1 text-[11px] uppercase tracking-[0.25em]"
              style={{
                color: d.executed ? "var(--green)" : "var(--green-dim)",
                borderColor: d.executed ? "var(--green)" : "var(--green-dim)",
              }}
            >
              <span aria-hidden>●</span>{" "}
              {d.executed ? "EXECUTED" : "PLAN ONLY"}
            </span>
          </div>
        </section>

        {/* PULL QUOTE */}
        <section
          className="py-6 border-b border-dashed"
          style={{ borderColor: "var(--green-dim)" }}
        >
          <p className="section-marker mb-3">[01] AGENT·MEMO</p>
          <div
            className="border p-4"
            style={{
              borderColor: "var(--green-dim)",
              background: "var(--bg-soft)",
            }}
          >
            <p
              className="text-[16px] leading-[1.55]"
              style={{ color: "var(--white)" }}
            >
              <span style={{ color: "var(--green)" }}>&gt;</span> {d.reasoning}
            </p>
            {d.alerts?.length ? (
              <ul
                className="mt-4 border-l-2 pl-3 space-y-1"
                style={{ borderColor: "var(--red)" }}
              >
                {d.alerts.map((a, i) => (
                  <li
                    key={i}
                    className="text-[12px]"
                    style={{ color: "var(--red)" }}
                  >
                    ⚠ {a}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        {/* TARGET ALLOCATION + SIGNALS */}
        <section
          className="py-6 border-b border-dashed grid grid-cols-12 gap-6"
          style={{ borderColor: "var(--green-dim)" }}
        >
          <div className="col-span-12 lg:col-span-7">
            <p className="section-marker mb-4">[02] TARGET·ALLOCATION</p>
            <AllocationBar
              actual={d.target_weights}
              target={d.prev_weights ?? undefined}
            />
            {d.prev_weights ? (
              <p className="label mt-4 normal-case tracking-normal">
                Top bar = new target; dim bar beneath = weights at decision
                time.
              </p>
            ) : null}
          </div>
          <div className="col-span-12 lg:col-span-5">
            <p className="section-marker mb-4">[03] SIGNALS·SNAPSHOT</p>
            <dl
              className="border"
              style={{
                borderColor: "var(--green-dim)",
                background: "var(--bg-soft)",
              }}
            >
              <Sig
                label="BTC 24H"
                value={`${s.btc_24h_change.toFixed(2)}%`}
                color={s.btc_24h_change >= 0 ? "var(--green)" : "var(--red)"}
              />
              <Sig
                label="ETH 24H"
                value={`${s.eth_24h_change.toFixed(2)}%`}
                color={s.eth_24h_change >= 0 ? "var(--green)" : "var(--red)"}
              />
              <Sig
                label="BTC VOL"
                value={`${s.btc_realized_vol.toFixed(2)}%`}
              />
              <Sig label="USDC" value={`$${s.usdc_price.toFixed(4)}`} />
              <Sig label="USDT" value={`$${s.usdt_price.toFixed(4)}`} />
              <Sig
                label="FETCHED"
                value={`${new Date(s.fetched_at)
                  .toISOString()
                  .slice(11, 19)}Z`}
                last
              />
            </dl>
          </div>
        </section>

        {/* ONCHAIN FOOTNOTE */}
        <section
          className="py-6 border-b border-dashed"
          style={{ borderColor: "var(--green-dim)" }}
        >
          <p className="section-marker mb-3">[04] ONCHAIN·FOOTNOTE</p>
          <p
            className="text-[13px] max-w-prose mb-5 leading-relaxed"
            style={{ color: "var(--green-dim)" }}
          >
            <span style={{ color: "var(--green)" }}>&gt;</span> Reasoning above
            was serialised, SHA-256 hashed, and pinned to the TraceAnchor
            contract on Arc. Swap legs (if any) settled via Circle DCW + the
            MockSwap router.
          </p>
          <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
            <div>
              <p className="label mb-2">TRACE·HASH · SHA256</p>
              <code
                className="block break-all text-[12px] border p-3"
                style={{
                  borderColor: "var(--green-dim)",
                  background: "var(--bg-soft)",
                  color: "var(--amber)",
                }}
              >
                {d.trace_hash ?? "—"}
              </code>
            </div>
            <div className="flex flex-col gap-2">
              {d.arc_tx_hash ? (
                <a
                  href={`${ARC_DISPLAY.explorerUrl}/tx/${d.arc_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-acid btn-sm text-center"
                >
                  [SWAP TX ↗]
                </a>
              ) : null}
              {d.circle_tx_id ? (
                <div
                  className="border p-3"
                  style={{
                    borderColor: "var(--green-dim)",
                    background: "var(--bg-soft)",
                  }}
                >
                  <div className="label mb-1">CIRCLE TX ID</div>
                  <div
                    className="text-[11px] break-all"
                    style={{ color: "var(--green-dim)" }}
                  >
                    {d.circle_tx_id}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <footer className="pt-4 pb-6 flex flex-wrap items-baseline justify-between gap-3 label">
          <span>
            TRAPEZA·TERM · {ARC_DISPLAY.name.toUpperCase()} · CHAIN{" "}
            {ARC_DISPLAY.chainId}
          </span>
          <Link
            href="/portfolio"
            className="hover:text-[color:var(--green)]"
          >
            [← BACK TO PORTFOLIO]
          </Link>
        </footer>
      </div>
    </div>
  );
}

function Sig({
  label,
  value,
  color,
  last,
}: {
  label: string;
  value: string;
  color?: string;
  last?: boolean;
}) {
  return (
    <div
      className="grid grid-cols-[1fr_auto] items-center px-3 py-2.5"
      style={{
        borderBottom: last ? "none" : "1px dashed var(--green-dim)",
      }}
    >
      <dt className="label">{label}</dt>
      <dd
        className="tabular-nums font-bold text-[12px]"
        style={{ color: color ?? "var(--white)" }}
      >
        {value}
      </dd>
    </div>
  );
}

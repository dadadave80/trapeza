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
          <Link
            href="/portfolio"
            className="kicker-ink underline underline-offset-4 decoration-[color:var(--stone)] hover:decoration-[color:var(--ink)]"
          >
            ← Portfolio
          </Link>
        }
      />

      <main className="mx-auto max-w-[820px] px-6 sm:px-10 py-12 sm:py-16">
        <article className="space-y-10">
          <header className="space-y-5">
            <div className="flex items-center gap-3">
              <RegimePill regime={d.regime} size="lg" />
              <span className="kicker text-[color:var(--taupe)]">
                Decision · {dateline}
              </span>
            </div>

            <h1
              className="display text-[44px] sm:text-[60px] text-[color:var(--ink)] dark:text-[color:var(--ivory)]"
              style={{ fontVariationSettings: '"opsz" 72' }}
            >
              Why this allocation?
            </h1>
          </header>

          <hr className="rule" />

          {/* The leader — pull-quote reasoning */}
          <section className="relative">
            <span
              className="absolute -left-2 -top-3 text-[color:var(--oxblood)] display-italic text-[64px] leading-none select-none"
              aria-hidden
            >
              “
            </span>
            <blockquote
              className="lede text-[24px] sm:text-[28px] text-[color:var(--ink)] dark:text-[color:var(--ivory)] pl-8"
              style={{ fontVariationSettings: '"opsz" 28' }}
            >
              {d.reasoning}
            </blockquote>
            <footer className="pl-8 pt-4 kicker">
              — Trapeza, on Gemini 3.1 Pro
            </footer>
          </section>

          {d.alerts?.length ? (
            <aside className="border-l-2 border-[color:var(--oxblood)] pl-4 space-y-1 text-sm">
              <p className="kicker-oxblood">Alerts</p>
              {d.alerts.map((a, i) => (
                <p key={i} className="text-[color:var(--ink-soft)] dark:text-[color:var(--ivory)]">
                  ⚠︎ {a}
                </p>
              ))}
            </aside>
          ) : null}

          <hr className="rule" />

          {/* Target allocation + signals — two-column editorial sidenote */}
          <section className="grid gap-10 md:grid-cols-2">
            <div>
              <p className="kicker-ink mb-4">Target allocation</p>
              <AllocationBar
                actual={d.target_weights}
                target={d.prev_weights ?? undefined}
              />
              {d.prev_weights ? (
                <p className="kicker pt-4">
                  Thicker rule = target. Thinner rule = where weights stood at
                  decision time.
                </p>
              ) : null}
            </div>

            <div>
              <p className="kicker-ink mb-4">Signals snapshot</p>
              <dl className="ledger grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm tabular-nums">
                <Sig label="BTC 24h" value={`${s.btc_24h_change.toFixed(2)}%`} />
                <Sig label="ETH 24h" value={`${s.eth_24h_change.toFixed(2)}%`} />
                <Sig label="BTC vol" value={`${s.btc_realized_vol.toFixed(2)}%`} />
                <Sig label="USDC" value={`$${s.usdc_price.toFixed(4)}`} />
                <Sig label="USDT" value={`$${s.usdt_price.toFixed(4)}`} />
                <Sig
                  label="Fetched"
                  value={new Date(s.fetched_at).toLocaleTimeString()}
                />
              </dl>
            </div>
          </section>

          <hr className="rule" />

          {/* Onchain footnote */}
          <section className="space-y-4">
            <p className="kicker-ink">Onchain footnote</p>
            <p className="text-sm text-[color:var(--ink-soft)] dark:text-[color:var(--taupe)] leading-relaxed max-w-prose">
              The reasoning above was serialised, SHA-256 hashed, and pinned to
              a TraceAnchor contract on Arc. The swap (if any) was settled
              through Circle App Kit via a developer-controlled SCA wallet.
            </p>

            <div className="space-y-1">
              <span className="kicker">Trace hash · sha256</span>
              <code className="ledger block break-all text-[12px] bg-[color:var(--ivory-2)] border border-[color:var(--stone-soft)] px-3 py-2 text-[color:var(--ink)] dark:text-[color:var(--ivory)]">
                {d.trace_hash ?? "—"}
              </code>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2">
              {d.arc_tx_hash ? (
                <a
                  href={`https://testnet.arcscan.app/tx/${d.arc_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kicker-ink underline underline-offset-4 decoration-[color:var(--stone)] hover:decoration-[color:var(--ink)]"
                >
                  Swap tx on arcscan ↗
                </a>
              ) : null}
              {d.circle_tx_id ? (
                <span className="kicker">
                  Circle tx <span className="ledger text-[color:var(--taupe)] normal-case tracking-tight">{d.circle_tx_id.slice(0, 8)}…</span>
                </span>
              ) : null}
              <span
                className={`inline-flex items-center text-[11px] tracking-[0.18em] uppercase ${
                  d.executed
                    ? "text-[color:var(--sage)]"
                    : "text-[color:var(--taupe)]"
                }`}
              >
                {d.executed ? "● Executed" : "○ Plan only"}
              </span>
            </div>
          </section>
        </article>

        <hr className="rule-thick mt-16" />
        <p className="pt-6 kicker">
          Trapeza · Arc Testnet · chainId 5042002
        </p>
      </main>
    </div>
  );
}

function Sig({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-[color:var(--taupe)] uppercase tracking-[0.14em] text-[11px]">
        {label}
      </dt>
      <dd className="text-right text-[color:var(--ink)] dark:text-[color:var(--ivory)]">
        {value}
      </dd>
    </>
  );
}

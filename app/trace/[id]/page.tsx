import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { supabaseServer } from "@/lib/db/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AllocationBar } from "@/components/allocation-bar";
import { RegimePill } from "@/components/regime-pill";
import { buttonVariants } from "@/components/ui/button";
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
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/onboard");

  const { data: d } = await supabase
    .from("decisions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<DecisionDetail>();

  if (!d) notFound();

  const s = d.signals;
  const targetSum = d.target_weights.usdc + d.target_weights.eurc + d.target_weights.cirbtc;

  return (
    <div className="flex flex-col flex-1 px-6 py-10 sm:px-10">
      <div className="w-full max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/portfolio"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Portfolio
          </Link>
          <RegimePill regime={d.regime} size="lg" />
        </div>

        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Decision · {new Date(d.created_at).toLocaleString()}
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Why this allocation?
          </h1>
        </header>

        <Card>
          <CardContent className="pt-6">
            <p className="text-lg leading-relaxed text-zinc-800 dark:text-zinc-200">
              {d.reasoning}
            </p>
            {d.alerts?.length ? (
              <ul className="mt-4 space-y-1 text-sm">
                {d.alerts.map((a, i) => (
                  <li key={i} className="text-amber-700 dark:text-amber-400">
                    ⚠︎ {a}
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Target allocation</CardTitle>
              <CardDescription>
                {targetSum > 0
                  ? "Where the agent wants weights to sit, given the regime + goal bands."
                  : "Target weights missing — likely a no-op tick."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AllocationBar
                actual={d.target_weights}
                target={d.prev_weights ?? undefined}
              />
              {d.prev_weights ? (
                <p className="text-xs text-zinc-500 mt-3">
                  Thin bar = weights at decision time. Thick bar = target.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Signals</CardTitle>
              <CardDescription>
                Snapshot fed to Gemini at decision time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <SigRow label="BTC 24h" value={`${s.btc_24h_change.toFixed(2)}%`} />
                <SigRow label="ETH 24h" value={`${s.eth_24h_change.toFixed(2)}%`} />
                <SigRow label="BTC vol" value={`${s.btc_realized_vol.toFixed(2)}%`} />
                <SigRow label="USDC" value={`$${s.usdc_price.toFixed(4)}`} />
                <SigRow label="USDT" value={`$${s.usdt_price.toFixed(4)}`} />
                <SigRow
                  label="Fetched"
                  value={new Date(s.fetched_at).toLocaleTimeString()}
                />
              </dl>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Onchain</CardTitle>
            <CardDescription>
              The reasoning trace is hashed and pinned to Arc so this decision
              is independently verifiable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wider text-zinc-500">
                Trace hash (sha256)
              </div>
              <code className="block break-all font-mono bg-muted px-3 py-2 rounded">
                {d.trace_hash ?? "—"}
              </code>
            </div>
            <div className="flex flex-wrap gap-3">
              {d.arc_tx_hash ? (
                <a
                  href={`https://testnet.arcscan.app/tx/${d.arc_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Swap tx ↗
                </a>
              ) : null}
              {d.circle_tx_id ? (
                <code className="text-xs text-zinc-500 self-center">
                  Circle tx id {d.circle_tx_id.slice(0, 8)}…
                </code>
              ) : null}
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${
                  d.executed
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {d.executed ? "Executed" : "Plan only"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SigRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right font-mono tabular-nums">{value}</dd>
    </>
  );
}

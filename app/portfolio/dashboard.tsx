"use client";

import { useEffect, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { goalBands, type Goal, type TargetWeights } from "@/lib/types";
import type { TokenBalances } from "@/lib/arc/balances";

type Props = {
  address: `0x${string}`;
  goal: Goal;
  email: string | null;
};

type PortfolioResponse = {
  address: string;
  walletId: string | null;
  goal: Goal;
  balances: TokenBalances;
};

type DecisionRow = {
  id: string;
  created_at: string;
  regime: string;
  target_weights: TargetWeights;
  prev_weights: TargetWeights | null;
  reasoning: string;
  alerts: string[];
  trace_hash: string | null;
  arc_tx_hash: string | null;
  circle_tx_id: string | null;
  executed: boolean;
};

export function Dashboard({ address, goal, email }: Props) {
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([
        fetch("/api/portfolio", { cache: "no-store" }),
        fetch("/api/trace", { cache: "no-store" }),
      ]);
      if (!p.ok) {
        const body = await p.json().catch(() => null);
        throw new Error(body?.details || body?.error || `HTTP ${p.status}`);
      }
      const json = (await p.json()) as PortfolioResponse;
      setData(json);
      if (t.ok) {
        const tj = (await t.json()) as { decisions: DecisionRow[] };
        setDecisions(tj.decisions ?? []);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, [refresh]);

  async function runAgent() {
    setRunning(true);
    try {
      const res = await fetch("/api/agent/trigger", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.details || body?.error || `HTTP ${res.status}`);
      } else if (body?.result?.skipped) {
        toast.message(`Agent: ${body.result.skipped}`);
      } else {
        toast.success("Agent ran. Refreshing…");
      }
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  const band = goalBands[goal];
  const balances = data?.balances;
  const latest = decisions[0];

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied");
    } catch {
      toast.error("Couldn't copy — long-press the address field instead.");
    }
  }

  return (
    <div className="flex flex-col flex-1 px-6 py-10 sm:px-10">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              {email ?? "signed in"} · {band.label}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">
              Your portfolio
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
            <Button onClick={runAgent} disabled={running}>
              {running ? "Running agent…" : "Run agent now"}
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Deposit</CardTitle>
              <CardDescription>
                Send testnet USDC, EURC, or cirBTC to this address. Get testnet
                USDC from{" "}
                <a
                  href="https://faucet.circle.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  faucet.circle.com
                </a>
                . On Arc, USDC is the native gas token.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-start gap-5">
                <div className="rounded-lg bg-white p-3 border">
                  <QRCodeSVG value={address} size={140} marginSize={0} />
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="text-xs uppercase tracking-wider text-zinc-500">
                    Arc Testnet address
                  </div>
                  <code className="block text-sm break-all font-mono bg-muted px-3 py-2 rounded">
                    {address}
                  </code>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={copyAddress}>
                      Copy
                    </Button>
                    <a
                      href={`https://testnet.arcscan.app/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      View on Arc explorer →
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Balances</CardTitle>
              <CardDescription>
                Polled every 10 seconds from Arc Testnet (
                <code className="text-xs">{`chainId 5042002`}</code>).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              ) : null}
              <div className="divide-y divide-border -mt-2">
                <BalanceRow
                  symbol="USDC"
                  amount={balances?.usdc}
                  hint="cash · native gas"
                  target={latest?.target_weights.usdc}
                  loading={loading && !balances}
                />
                <BalanceRow
                  symbol="EURC"
                  amount={balances?.eurc}
                  hint="safe-FX"
                  target={latest?.target_weights.eurc}
                  loading={loading && !balances}
                />
                <BalanceRow
                  symbol="cirBTC"
                  amount={balances?.cirbtc}
                  hint="risk"
                  target={latest?.target_weights.cirbtc}
                  loading={loading && !balances}
                />
              </div>
              {balances ? (
                <div className="pt-4 mt-4 border-t text-sm text-zinc-500">
                  Last fetched{" "}
                  {new Date(balances.fetched_at).toLocaleTimeString()}.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Latest decision</CardTitle>
            <CardDescription>
              {latest
                ? `${new Date(latest.created_at).toLocaleString()} · regime ${latest.regime}`
                : "No decisions yet. Fund your wallet and click “Run agent now”."}
            </CardDescription>
          </CardHeader>
          {latest ? (
            <CardContent className="space-y-4">
              <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">
                {latest.reasoning}
              </p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Mini label="USDC target" value={pct(latest.target_weights.usdc)} />
                <Mini label="EURC target" value={pct(latest.target_weights.eurc)} />
                <Mini label="cirBTC target" value={pct(latest.target_weights.cirbtc)} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {latest.executed ? (
                  <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5">
                    Executed
                  </span>
                ) : (
                  <span className="rounded-full bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 px-2.5 py-0.5">
                    Plan only
                  </span>
                )}
                {latest.arc_tx_hash ? (
                  <a
                    className="underline text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100"
                    href={`https://testnet.arcscan.app/tx/${latest.arc_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Swap tx ↗
                  </a>
                ) : null}
                {latest.trace_hash ? (
                  <span
                    className="font-mono text-xs text-zinc-500"
                    title={latest.trace_hash}
                  >
                    trace {latest.trace_hash.slice(0, 12)}…{latest.trace_hash.slice(-6)}
                  </span>
                ) : null}
              </div>
            </CardContent>
          ) : null}
        </Card>

        {decisions.length > 1 ? (
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
              <CardDescription>
                Last {Math.min(10, decisions.length - 1)} decisions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {decisions.slice(1, 11).map((d) => (
                  <li key={d.id} className="py-3 flex flex-wrap gap-3 items-baseline">
                    <span className="text-xs text-zinc-500 tabular-nums">
                      {new Date(d.created_at).toLocaleTimeString()}
                    </span>
                    <span className="text-xs uppercase tracking-wider text-zinc-500">
                      {d.regime}
                    </span>
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1 min-w-0 line-clamp-2">
                      {d.reasoning}
                    </span>
                    {d.arc_tx_hash ? (
                      <a
                        href={`https://testnet.arcscan.app/tx/${d.arc_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline text-zinc-500"
                      >
                        tx ↗
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function BalanceRow({
  symbol,
  amount,
  hint,
  target,
  loading,
}: {
  symbol: string;
  amount: number | undefined;
  hint: string;
  target?: number;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="font-medium">{symbol}</div>
        <div className="text-xs text-zinc-500">
          {hint}
          {target !== undefined ? ` · target ${pct(target)}` : ""}
        </div>
      </div>
      <div className="text-right font-mono text-sm tabular-nums">
        {loading ? "…" : amount !== undefined ? amount.toFixed(4) : "—"}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

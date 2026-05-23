"use client";

import { useEffect, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { goalBands, type Goal } from "@/lib/types";
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

export function Dashboard({ address, goal, email }: Props) {
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.details || body?.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as PortfolioResponse;
      setData(json);
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

  const band = goalBands[goal];
  const balances = data?.balances;

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
          <Button variant="outline" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
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
                  loading={loading && !balances}
                />
                <BalanceRow
                  symbol="EURC"
                  amount={balances?.eurc}
                  hint="safe-FX"
                  loading={loading && !balances}
                />
                <BalanceRow
                  symbol="cirBTC"
                  amount={balances?.cirbtc}
                  hint="risk"
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
            <CardTitle>Agent</CardTitle>
            <CardDescription>
              The agent runs every 15 min (GitHub Actions cron → /api/agent/run).
              Decisions, reasoning traces, and onchain anchor txns will land
              here once Phase 3 is wired up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">
              No decisions yet. Fund your wallet to start the loop.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BalanceRow({
  symbol,
  amount,
  hint,
  loading,
}: {
  symbol: string;
  amount: number | undefined;
  hint: string;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="font-medium">{symbol}</div>
        <div className="text-xs text-zinc-500">{hint}</div>
      </div>
      <div className="text-right font-mono text-sm tabular-nums">
        {loading ? "…" : amount !== undefined ? amount.toFixed(4) : "—"}
      </div>
    </div>
  );
}

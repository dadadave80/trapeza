"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { goalBands, type Goal } from "@/lib/types";

export function GoalPicker({ initialGoal }: { initialGoal: Goal | null }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Goal>(initialGoal ?? "balanced");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.details || data?.error || `HTTP ${res.status}`;
        setError(msg);
        toast.error(msg);
        setCreating(false);
        return;
      }
      router.push("/portfolio");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(msg);
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(goalBands) as Goal[]).map((g) => {
          const b = goalBands[g];
          const active = selected === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setSelected(g)}
              className={`text-left rounded-lg border transition-colors ${
                active
                  ? "border-foreground bg-foreground/[0.04] dark:bg-foreground/[0.06]"
                  : "border-border hover:bg-accent/50"
              }`}
            >
              <Card className="border-0 bg-transparent shadow-none gap-3">
                <CardHeader>
                  <CardTitle className="text-lg">{b.label}</CardTitle>
                  <CardDescription>{b.blurb}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <div>
                    cirBTC ∈ [{b.cirbtc[0].toFixed(2)}, {b.cirbtc[1].toFixed(2)}]
                  </div>
                  <div>EURC ≥ {b.eurcMin.toFixed(2)}</div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          <div className="font-medium mb-1">Wallet creation failed</div>
          <div className="break-words">{error}</div>
          <div className="mt-2 text-xs opacity-80">
            Common causes: Supabase schema not applied (check{" "}
            <code>lib/db/schema.sql</code> ran), Circle wallet-set id wrong, or
            Arc Testnet rate-limited. Check the Vercel function logs for the
            full server-side trace.
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-500">
          We&apos;ll create a Circle developer-controlled SCA wallet on Arc Testnet.
        </p>
        <Button onClick={submit} disabled={creating} size="lg">
          {creating ? "Creating wallet…" : "Create my wallet"}
        </Button>
      </div>
    </div>
  );
}

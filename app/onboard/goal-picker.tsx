"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { goalBands, type Goal } from "@/lib/types";

const NUMERALS: Record<Goal, string> = {
  conservative: "I",
  balanced: "II",
  aggressive: "III",
};

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
    <div className="space-y-10">
      <div className="grid gap-0 md:grid-cols-3 border-t border-b border-[color:var(--stone)]">
        {(Object.keys(goalBands) as Goal[]).map((g, i) => {
          const b = goalBands[g];
          const active = selected === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setSelected(g)}
              aria-pressed={active}
              className={`group text-left p-7 transition-colors ${
                i < 2 ? "md:border-r border-[color:var(--stone)]" : ""
              } ${
                active
                  ? "bg-[color:var(--ivory-2)]"
                  : "hover:bg-[color:var(--ivory-2)]/50"
              }`}
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="display-italic text-[color:var(--oxblood)] text-3xl">
                  §{NUMERALS[g]}
                </span>
                <span
                  aria-hidden
                  className={`size-3 rounded-full border-2 ${
                    active
                      ? "bg-[color:var(--oxblood)] border-[color:var(--oxblood)]"
                      : "border-[color:var(--stone)] group-hover:border-[color:var(--ink)]"
                  }`}
                />
              </div>
              <h3
                className="display text-[28px] mt-3 text-[color:var(--ink)] dark:text-[color:var(--ivory)]"
                style={{ fontVariationSettings: '"opsz" 32' }}
              >
                {b.label}
              </h3>
              <p className="text-sm text-[color:var(--ink-soft)] dark:text-[color:var(--taupe)] leading-relaxed mt-2">
                {b.blurb}
              </p>
              <dl className="ledger mt-5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px] tabular-nums text-[color:var(--taupe)]">
                <dt>cirBTC</dt>
                <dd className="text-right text-[color:var(--ink)] dark:text-[color:var(--ivory)]">
                  {b.cirbtc[0].toFixed(2)} – {b.cirbtc[1].toFixed(2)}
                </dd>
                <dt>EURC ≥</dt>
                <dd className="text-right text-[color:var(--ink)] dark:text-[color:var(--ivory)]">
                  {b.eurcMin.toFixed(2)}
                </dd>
              </dl>
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="border border-[color:var(--oxblood)]/30 bg-[color:var(--oxblood-soft)] p-4 text-sm space-y-2">
          <div className="kicker-oxblood">Wallet creation failed</div>
          <div className="text-[color:var(--oxblood)] break-words">{error}</div>
          <p className="text-xs text-[color:var(--ink-soft)] dark:text-[color:var(--taupe)]">
            Most common: <code className="ledger">lib/db/schema.sql</code> not
            applied in Supabase, <code className="ledger">CIRCLE_WALLET_SET_ID</code> mismatch,
            or Arc Testnet rate-limited. Vercel function logs have the full server
            trace.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-baseline justify-between gap-4 pt-4">
        <p className="text-sm text-[color:var(--taupe)] max-w-prose">
          A Circle developer-controlled SCA wallet is minted on Arc Testnet.
          We never see your funds — the agent only ever holds your deposits.
        </p>
        <Button
          onClick={submit}
          disabled={creating}
          size="lg"
          style={{ borderRadius: "3px" }}
        >
          {creating ? "Opening account…" : "Open my account →"}
        </Button>
      </div>
    </div>
  );
}

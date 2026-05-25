"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { goalBands, type Goal } from "@/lib/types";

const NUMERALS: Record<Goal, string> = {
  conservative: "I",
  balanced: "II",
  aggressive: "III",
};

export function GoalPicker({ initialGoal }: { initialGoal: Goal | null }) {
  const router = useRouter();
  // No default — user MUST pick. Prevents the "click through, get balanced
  // by accident" failure mode QA #11.
  const [selected, setSelected] = useState<Goal | null>(initialGoal);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!selected) return;
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
    <>
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="label py-5 border-b border-black flex items-baseline justify-between gap-3 flex-wrap">
            <span>Pick one · weights live inside these bands</span>
            {!selected ? (
              <span className="text-[color:var(--ink-muted)]">
                ▢ no selection yet
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3">
            {(Object.keys(goalBands) as Goal[]).map((g, i) => {
              const b = goalBands[g];
              const active = selected === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelected(g)}
                  aria-pressed={active}
                  className={`text-left p-8 lg:p-10 transition-colors border-b lg:border-b-0 border-black ${
                    i < 2 ? "lg:border-r lg:border-black" : ""
                  } ${
                    active
                      ? "bg-black text-white"
                      : "bg-white text-black hover:bg-[#fff6a3]"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div
                      className="font-bold inline-block px-2 -ml-1"
                      style={{
                        background: "#00FF66",
                        color: "#000",
                        fontSize: "44px",
                        lineHeight: 1,
                      }}
                    >
                      §{NUMERALS[g]}
                    </div>
                    <span
                      aria-hidden
                      className={`size-4 border-2 ${
                        active
                          ? "border-[#00FF66] bg-[#00FF66]"
                          : "border-black"
                      }`}
                    />
                  </div>
                  <h3 className="text-3xl font-bold tracking-tight mt-5">
                    {b.label}
                  </h3>
                  <p
                    className={`text-sm leading-relaxed mt-3 ${
                      active ? "text-white" : "text-black opacity-80"
                    }`}
                  >
                    {b.blurb}
                  </p>
                  <dl
                    className={`mt-6 pt-5 ${
                      active ? "border-t border-white/40" : "border-t border-black"
                    } grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 label ledger`}
                  >
                    <dt className="opacity-70">cirBTC</dt>
                    <dd className="text-right tabular-nums">
                      {b.cirbtc[0].toFixed(2)} – {b.cirbtc[1].toFixed(2)}
                    </dd>
                    <dt className="opacity-70">EURC ≥</dt>
                    <dd className="text-right tabular-nums">
                      {b.eurcMin.toFixed(2)}
                    </dd>
                  </dl>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {error ? (
        <section className="border-b-2 border-black">
          <div className="mx-auto max-w-[1280px] px-6 py-6">
            <div
              className="border-2 border-black p-5"
              style={{ background: "var(--red-soft)" }}
            >
              <div className="label mb-2" style={{ color: "var(--red)" }}>
                ▍ Wallet creation failed
              </div>
              <div className="text-sm font-medium mb-2 break-words">{error}</div>
              <p className="label opacity-70 leading-relaxed normal-case">
                Most common: <code className="ledger normal-case">lib/db/schema.sql</code> not
                applied in Supabase, <code className="ledger normal-case">CIRCLE_WALLET_SET_ID</code> mismatch,
                or Arc Testnet rate-limited. Vercel function logs have the full server trace.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4 py-8">
          <p className="col-span-12 lg:col-span-7 lg:border-r lg:border-black lg:pr-6 text-sm leading-relaxed">
            A Circle developer-controlled SCA wallet is minted on Arc Testnet.
            We never see your funds — the agent only ever holds your deposits.
          </p>
          <div className="col-span-12 lg:col-span-5 lg:pl-6 flex items-center justify-end pt-4 lg:pt-0">
            <button
              onClick={submit}
              disabled={creating || !selected}
              className="btn-acid w-full lg:w-auto !text-sm !py-4"
            >
              {creating
                ? "▶ Opening account…"
                : selected
                  ? `▶ Open my ${selected} account`
                  : "▶ Select a mandate above"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

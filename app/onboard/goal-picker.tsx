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
  // No default — user MUST pick.
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
    <div className="mx-auto max-w-[1180px] px-5">
      <section
        className="py-6 border-b border-dashed"
        style={{ borderColor: "var(--green-dim)" }}
      >
        <div className="section-marker mb-4 flex items-baseline justify-between gap-3 flex-wrap">
          <span>[STEP II / II] · PICK MANDATE · WEIGHTS LIVE INSIDE BANDS</span>
          {!selected ? (
            <span style={{ color: "var(--amber)" }}>▢ NO SELECTION YET</span>
          ) : (
            <span style={{ color: "var(--green)" }}>
              ▣ {selected.toUpperCase()}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {(Object.keys(goalBands) as Goal[]).map((g) => {
            const b = goalBands[g];
            const active = selected === g;
            const borderColor = active ? "var(--green)" : "var(--green-dim)";
            return (
              <button
                key={g}
                type="button"
                onClick={() => setSelected(g)}
                aria-pressed={active}
                className="text-left p-5 border transition-colors hover:bg-[color:var(--bg-row-hover)]"
                style={{
                  borderColor,
                  background: active
                    ? "var(--green-soft)"
                    : "var(--bg-soft)",
                }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div
                    className="font-bold inline-block px-2 text-[20px] leading-none tracking-[0.15em]"
                    style={{
                      background: "var(--green)",
                      color: "var(--bg)",
                    }}
                  >
                    §{NUMERALS[g]}
                  </div>
                  <span
                    aria-hidden
                    className="size-3 border"
                    style={{
                      borderColor: active ? "var(--green)" : "var(--green-dim)",
                      background: active ? "var(--green)" : "transparent",
                    }}
                  />
                </div>
                <h3
                  className="text-[16px] font-bold tracking-[0.2em] uppercase mt-4"
                  style={{ color: "var(--white)" }}
                >
                  {b.label}
                </h3>
                <p
                  className="text-[12px] leading-relaxed mt-2"
                  style={{ color: "var(--green-dim)" }}
                >
                  {b.blurb}
                </p>
                <dl
                  className="mt-4 pt-3 border-t border-dashed grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] tabular-nums"
                  style={{ borderColor: "var(--green-dim)" }}
                >
                  <dt style={{ color: "var(--green-dim)" }}>CIRBTC</dt>
                  <dd
                    className="text-right"
                    style={{ color: "var(--white)" }}
                  >
                    {b.cirbtc[0].toFixed(2)} – {b.cirbtc[1].toFixed(2)}
                  </dd>
                  <dt style={{ color: "var(--green-dim)" }}>USYC ≥</dt>
                  <dd
                    className="text-right"
                    style={{ color: "var(--amber)" }}
                  >
                    {b.usycMin.toFixed(2)}
                  </dd>
                  <dt style={{ color: "var(--green-dim)" }}>EURC ≥</dt>
                  <dd
                    className="text-right"
                    style={{ color: "var(--white)" }}
                  >
                    {b.eurcMin.toFixed(2)}
                  </dd>
                  <dt style={{ color: "var(--green-dim)" }}>USDC ≥</dt>
                  <dd
                    className="text-right"
                    style={{ color: "var(--white)" }}
                  >
                    {b.usdcMin.toFixed(2)}
                  </dd>
                </dl>
              </button>
            );
          })}
        </div>
      </section>

      {error ? (
        <section
          className="py-4 border-b border-dashed"
          style={{ borderColor: "var(--red)" }}
        >
          <div
            className="border p-4"
            style={{
              borderColor: "var(--red)",
              background: "var(--red-soft)",
            }}
          >
            <div
              className="section-marker mb-1"
              style={{ color: "var(--red)" }}
            >
              ▍ WALLET CREATION FAILED
            </div>
            <div
              className="text-[13px] mb-2 break-words"
              style={{ color: "var(--white)" }}
            >
              {error}
            </div>
            <p
              className="text-[11px] leading-relaxed"
              style={{ color: "var(--green-dim)" }}
            >
              Most common: <code style={{ color: "var(--amber)" }}>
                lib/db/schema.sql
              </code>{" "}
              not applied in Supabase,{" "}
              <code style={{ color: "var(--amber)" }}>
                CIRCLE_WALLET_SET_ID
              </code>{" "}
              mismatch, or Arc Testnet rate-limited. Vercel function logs have
              the full server trace.
            </p>
          </div>
        </section>
      ) : null}

      <section className="py-6 grid grid-cols-12 gap-6">
        <p
          className="col-span-12 lg:col-span-7 text-[13px] leading-relaxed"
          style={{ color: "var(--white)" }}
        >
          <span style={{ color: "var(--green)" }}>&gt;</span> A Circle
          developer-controlled SCA wallet is minted on Arc Testnet. We never
          see funds — the agent only ever holds the user&apos;s deposits.
        </p>
        <div className="col-span-12 lg:col-span-5 flex items-center justify-end pt-2 lg:pt-0">
          <button
            onClick={submit}
            disabled={creating || !selected}
            className="btn-acid w-full lg:w-auto !text-[12px] !py-3"
          >
            {creating
              ? "[OPENING ACCOUNT…]"
              : selected
                ? `[OPEN MY ${selected.toUpperCase()} ACCOUNT ↗]`
                : "[SELECT A MANDATE ABOVE]"}
          </button>
        </div>
      </section>
    </div>
  );
}

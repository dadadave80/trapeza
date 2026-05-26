"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/db/browser";
import type { Goal } from "@/lib/types";

// TRAPEZA·TERM top bar. Phosphor-green wordmark, version + chain badge on
// the left; user / mandate / actions on the right. Dashed bottom rule, no
// hard 2px borders.

const GOALS: Goal[] = ["conservative", "balanced", "aggressive"];

export function Masthead({
  mandate,
  email,
  right,
  signOut = true,
}: {
  mandate?: Goal;
  email?: string | null;
  right?: React.ReactNode;
  signOut?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nowZ] = useState(() => new Date().toISOString().slice(11, 19));

  async function changeGoal(next: Goal) {
    if (next === mandate) return;
    const res = await fetch("/api/wallet", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal: next }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.details || body?.error || `HTTP ${res.status}`);
      return;
    }
    toast.success(`MAND → ${next.toUpperCase()}`);
    startTransition(() => router.refresh());
  }

  async function doSignOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    startTransition(() => router.push("/"));
  }

  return (
    <div className="border-b border-dashed border-[color:var(--green-dim)]">
      <div className="mx-auto max-w-[1280px] px-5 py-3 grid grid-cols-[1fr_auto] items-center gap-4">
        <Link
          href="/"
          className="flex items-baseline gap-4 min-w-0"
          aria-label="Trapeza terminal home"
        >
          <span
            className="text-base font-bold tracking-[0.3em]"
            style={{ color: "var(--amber)" }}
          >
            TRAPEZA·TERM
          </span>
          <span className="text-[11px] text-[color:var(--green-dim)] truncate hidden sm:inline">
            v0.5.0 · ARC-TESTNET · 5042002
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4 text-[11px]">
          <span className="hidden lg:flex items-center gap-1.5 text-[color:var(--green)]">
            <span
              className="size-2 rounded-full animate-pulse"
              style={{ background: "var(--green)" }}
              aria-hidden
            />
            LIVE · {nowZ}Z
          </span>
          {email ? (
            <span className="hidden lg:inline text-[color:var(--green-dim)] max-w-[220px] truncate">
              USR {email}
            </span>
          ) : null}
          {mandate ? (
            <div className="hidden sm:flex items-center gap-1 border-l border-dashed border-[color:var(--green-dim)] pl-3">
              <span className="text-[color:var(--green-dim)]">MAND</span>
              <select
                value={mandate}
                onChange={(e) => changeGoal(e.target.value as Goal)}
                disabled={pending}
                aria-label="Change mandate"
                className="bg-transparent text-[color:var(--green)] uppercase tracking-[0.2em] text-[11px] cursor-pointer focus:outline-none border-0 p-0"
              >
                {GOALS.map((g) => (
                  <option
                    key={g}
                    value={g}
                    className="bg-[color:var(--bg-soft)] text-[color:var(--green)]"
                  >
                    {g.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {right ? (
            <span className="hidden md:flex items-center border-l border-dashed border-[color:var(--green-dim)] pl-3">
              {right}
            </span>
          ) : null}
          {signOut ? (
            <button
              onClick={doSignOut}
              disabled={pending}
              className="border-l border-dashed border-[color:var(--green-dim)] pl-3 text-[color:var(--green-dim)] hover:text-[color:var(--green)] disabled:opacity-50 uppercase tracking-[0.25em]"
              aria-label="Sign out"
            >
              [LOGOUT]
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/db/browser";
import type { Goal } from "@/lib/types";

// Brutalist top strip — black wordmark on white, vertical column dividers,
// every cell a tracked-uppercase microcaption. Used on every authed page.
//
// Right-side slots:
//   - mandate (optional, current goal — clickable dropdown that PATCHes /api/wallet)
//   - email (optional, truncated on narrow screens)
//   - right (any extra slot a page wants to inject)
//   - signOut (optional, hides the sign-out button if you set it false)

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
    toast.success(`Mandate → ${next}`);
    startTransition(() => router.refresh());
  }

  async function doSignOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    startTransition(() => router.push("/"));
  }

  return (
    <div className="border-b-2 border-black">
      <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
        <Link
          href="/"
          className="col-span-6 sm:col-span-3 border-r border-black py-3 label-lg flex items-center min-w-0"
        >
          <span className="text-base font-bold tracking-tight">Trapeza</span>
          <span className="ml-2 hidden sm:inline opacity-60 truncate">
            ▍ Treasury OS
          </span>
        </Link>
        <div className="col-span-6 sm:col-span-9 py-3 flex items-center justify-end gap-3 sm:gap-4 label min-w-0">
          {email ? (
            <span className="hidden lg:inline opacity-60 max-w-[180px] truncate">
              {email}
            </span>
          ) : null}
          {mandate ? (
            <div className="hidden sm:flex items-center gap-2 border-l border-black pl-3 sm:pl-4">
              <span className="opacity-60">Mandate /</span>
              <select
                value={mandate}
                onChange={(e) => changeGoal(e.target.value as Goal)}
                disabled={pending}
                aria-label="Change mandate"
                className="bg-transparent label cursor-pointer hover:underline focus:outline-none border-0 p-0"
              >
                {GOALS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {right ? (
            <span className="hidden md:flex items-center border-l border-black pl-3 sm:pl-4">
              {right}
            </span>
          ) : null}
          {signOut ? (
            <button
              onClick={doSignOut}
              disabled={pending}
              className="border-l border-black pl-3 sm:pl-4 hover:underline disabled:opacity-50"
              aria-label="Sign out"
            >
              ▶ Sign out
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

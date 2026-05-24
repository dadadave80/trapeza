"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/db/browser";
import { GoalPicker } from "./goal-picker";
import type { Goal } from "@/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "unauthed" }
  | { kind: "authed-no-wallet"; goal: Goal | null; email: string | null; userId: string };

// Client-side auth probe. Runs on mount; cheap if unauthed (no cookie =
// instant null from supabaseBrowser.auth.getUser()). The expensive server
// path (the row lookup against public.users) only runs if a session exists.
//
// Behaviour:
//   no session         → render `fallback` (the static unauthed view)
//   session, wallet OK → router.replace("/portfolio")
//   session, no wallet → render <GoalPicker />
//
// Until the probe finishes, we render the fallback so there's no blank flash.
export function SessionGate({ fallback }: { fallback: React.ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<State>({ kind: "loading" });

  // Pull URL banners from search params (these used to come from the server
  // component via searchParams; now we read them client-side so the static
  // shell doesn't need to render anything dynamic).
  const error = params.get("error");
  const sent = params.get("sent");

  useEffect(() => {
    let cancelled = false;

    async function probe() {
      const supabase = supabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        setState({ kind: "unauthed" });
        return;
      }

      // Authed — does this user have a wallet yet?
      const res = await fetch("/api/wallet", { cache: "no-store" });
      if (cancelled) return;
      const body = (await res.json().catch(() => null)) as
        | { user?: { goal?: Goal | null; arc_address?: string | null } }
        | null;
      const row = body?.user ?? null;

      if (row?.arc_address) {
        router.replace("/portfolio");
        return;
      }

      setState({
        kind: "authed-no-wallet",
        goal: row?.goal ?? null,
        email: user.email ?? null,
        userId: user.id,
      });
    }

    probe();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state.kind === "loading" || state.kind === "unauthed") {
    return (
      <>
        {(error || sent) && (
          <div className="mx-auto max-w-[1280px] px-6 pt-6">
            {error ? (
              <div
                className="border-2 border-black p-4 mb-4"
                style={{ background: "var(--red-soft)" }}
              >
                <div className="label mb-1" style={{ color: "var(--red)" }}>
                  Error
                </div>
                <div className="text-sm">{decodeURIComponent(error)}</div>
              </div>
            ) : null}
            {sent ? (
              <div
                className="border-2 border-black p-4 mb-4"
                style={{ background: "#00FF66" }}
              >
                <div className="label mb-1">Sent</div>
                <div className="text-sm">
                  Check your inbox. The link signs you in.
                </div>
              </div>
            ) : null}
          </div>
        )}
        {fallback}
      </>
    );
  }

  // Authed, no wallet — render the goal picker.
  return (
    <>
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 lg:col-span-8 lg:border-r lg:border-black py-8 lg:py-12 lg:pr-6">
            <div className="label mb-3 lg:mb-4">Step II / II · Risk mandate</div>
            <h1
              className="font-bold tracking-[-0.04em] leading-[0.9]"
              style={{ fontSize: "clamp(36px, 9vw, 120px)" }}
            >
              What kind of
              <br />
              <span
                className="inline-block px-3 -ml-1"
                style={{ background: "#00FF66" }}
              >
                client
              </span>{" "}
              are you?
            </h1>
          </div>

          <div className="col-span-12 lg:col-span-4 py-8 lg:py-12 lg:pl-6 flex flex-col justify-end gap-4">
            <p className="text-base leading-relaxed max-w-prose">
              Each mandate fixes the bands the agent must respect on every
              rebalance. You can switch later from the dashboard.
            </p>
            <p className="label">
              Signed in as{" "}
              <span className="ledger normal-case tracking-tight text-[10px] opacity-60">
                {state.email ?? state.userId}
              </span>
            </p>
          </div>
        </div>
      </section>

      <GoalPicker initialGoal={state.goal} />
    </>
  );
}

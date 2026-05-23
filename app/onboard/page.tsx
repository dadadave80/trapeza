import { redirect } from "next/navigation";
import { supabaseServer, supabaseService } from "@/lib/db/client";
import { EmailForm } from "./email-form";
import { GoalPicker } from "./goal-picker";

export const dynamic = "force-dynamic";

export default async function OnboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const params = await searchParams;

  if (!user) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-6 py-24">
        <div className="w-full max-w-md space-y-6">
          <Header
            kicker="Step 1 of 2"
            title="Sign in to Trapeza"
            blurb="We send a magic link to your email — no password, no wallet seed."
          />
          {params.error ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {decodeURIComponent(params.error)}
            </p>
          ) : null}
          {params.sent ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Check your email — the link logs you in.
            </p>
          ) : null}
          <EmailForm />
        </div>
      </div>
    );
  }

  // Authed. If a wallet already exists, send them to the dashboard.
  // Use service role for the read (anon-with-session is blocked by RLS when
  // it's enabled on public.users).
  const svc = supabaseService();
  const { data: row } = await svc
    .from("users")
    .select("arc_address, goal")
    .eq("id", user.id)
    .maybeSingle();

  if (row?.arc_address) {
    redirect("/portfolio");
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl space-y-8">
        <Header
          kicker="Step 2 of 2"
          title="Pick a risk profile"
          blurb={`Signed in as ${user.email ?? user.id}. Your goal sets the bands the agent must respect on every rebalance.`}
        />
        <GoalPicker initialGoal={row?.goal ?? null} />
      </div>
    </div>
  );
}

function Header({
  kicker,
  title,
  blurb,
}: {
  kicker: string;
  title: string;
  blurb: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{kicker}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">{blurb}</p>
    </div>
  );
}

import Link from "next/link";
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

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-[color:var(--ink)] dark:border-[color:var(--ivory)]/30">
        <div className="mx-auto max-w-[1080px] px-6 sm:px-10 py-5 flex items-baseline justify-between gap-6">
          <Link href="/" className="flex items-baseline gap-3">
            <span
              className="font-display text-[28px] tracking-tight text-[color:var(--ink)] dark:text-[color:var(--ivory)]"
              style={{ fontVariationSettings: '"opsz" 36' }}
            >
              Trapeza
            </span>
            <span className="kicker hidden sm:inline">
              Τράπεζα · the agora&apos;s table
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-[1080px] px-6 sm:px-10 py-16 sm:py-24">
        {!user ? (
          <UnauthedView params={params} />
        ) : (
          <AuthedView userId={user.id} userEmail={user.email ?? null} />
        )}
      </main>
    </div>
  );
}

function UnauthedView({ params }: { params: { error?: string; sent?: string } }) {
  return (
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-x-12 gap-y-10 items-start">
      <div className="space-y-6">
        <p className="kicker">Step I of II · Sign in</p>
        <h1
          className="display text-[44px] sm:text-[64px] text-[color:var(--ink)] dark:text-[color:var(--ivory)]"
          style={{ fontVariationSettings: '"opsz" 84' }}
        >
          Open an account
          <br />
          at the agora&apos;s
          <br />
          <span className="display-italic text-[color:var(--oxblood)]">
            table.
          </span>
        </h1>
        <p className="lede text-[19px] text-[color:var(--ink-soft)] dark:text-[color:var(--taupe)] max-w-prose">
          A magic link arrives by email — no password, no seed phrase. We mint
          your Circle wallet the moment you pick a goal.
        </p>
      </div>

      <aside className="lg:pl-10 lg:border-l lg:border-[color:var(--stone)] space-y-5">
        <div className="space-y-1">
          <p className="kicker-ink">Magic link</p>
          <hr className="rule" />
        </div>

        {params.error ? (
          <div className="border border-[color:var(--oxblood)]/30 bg-[color:var(--oxblood-soft)] px-4 py-3 text-sm text-[color:var(--oxblood)]">
            {decodeURIComponent(params.error)}
          </div>
        ) : null}
        {params.sent ? (
          <div className="border border-[color:var(--sage)]/30 bg-[color:var(--sage-soft)] px-4 py-3 text-sm text-[color:var(--sage)]">
            Sent. Check your inbox — the link signs you in.
          </div>
        ) : null}

        <EmailForm />

        <p className="kicker text-[color:var(--taupe)] pt-2">
          We never store passwords. Sessions live in a signed cookie that
          expires when you close your tab.
        </p>
      </aside>
    </div>
  );
}

async function AuthedView({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string | null;
}) {
  const svc = supabaseService();
  const { data: row } = await svc
    .from("users")
    .select("arc_address, goal")
    .eq("id", userId)
    .maybeSingle();

  if (row?.arc_address) {
    redirect("/portfolio");
  }

  return (
    <div className="space-y-12">
      <div className="space-y-4 max-w-3xl">
        <p className="kicker">Step II of II · Risk mandate</p>
        <h1
          className="display text-[44px] sm:text-[64px] text-[color:var(--ink)] dark:text-[color:var(--ivory)]"
          style={{ fontVariationSettings: '"opsz" 84' }}
        >
          What kind of
          <br />
          <span className="display-italic text-[color:var(--oxblood)]">
            client
          </span>{" "}
          are you?
        </h1>
        <p className="lede text-[19px] text-[color:var(--ink-soft)] dark:text-[color:var(--taupe)] max-w-prose">
          Each mandate fixes the bands the agent must respect on every
          rebalance. You can switch later by editing your goal — the agent will
          tilt back into the new bands on its next run.
        </p>
        <p className="kicker">
          Signed in as <span className="ledger normal-case tracking-tight text-[color:var(--taupe)]">{userEmail ?? userId}</span>
        </p>
      </div>

      <GoalPicker initialGoal={row?.goal ?? null} />
    </div>
  );
}

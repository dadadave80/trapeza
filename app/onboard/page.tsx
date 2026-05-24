import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer, supabaseService } from "@/lib/db/client";
import { EmailForm } from "./email-form";
import { GoalPicker } from "./goal-picker";
import { ARC_DISPLAY } from "@/lib/constants";

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
    <div className="flex-1 flex flex-col bg-white text-black">
      {/* Masthead */}
      <header className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <Link
            href="/"
            className="col-span-4 sm:col-span-3 border-r border-black py-3 label-lg flex items-center"
          >
            <span className="text-base font-bold tracking-tight">Trapeza</span>
            <span className="ml-2 hidden sm:inline opacity-60">▍ Treasury OS</span>
          </Link>
          <div className="col-span-8 sm:col-span-9 py-3 flex items-center justify-end label">
            {ARC_DISPLAY.name} ▶ {ARC_DISPLAY.chainId}
          </div>
        </div>
      </header>

      <main className="flex-1">
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
    <section className="border-b-2 border-black">
      <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
        <div className="col-span-12 lg:col-span-7 border-r border-black py-16 lg:py-24 lg:pr-6">
          <div className="label mb-4">Step I / II · Sign in</div>
          <h1
            className="font-bold tracking-[-0.04em] leading-[0.9]"
            style={{ fontSize: "clamp(48px, 9vw, 128px)" }}
          >
            Open an account
            <br />
            at the
            <span
              className="inline-block px-3 ml-3"
              style={{ background: "#00FF66" }}
            >
              agora&apos;s
            </span>
            <br />
            table.
          </h1>
          <p className="mt-8 max-w-xl text-[17px] leading-relaxed">
            A magic link arrives by email — no password, no seed phrase. We
            mint your Circle wallet the moment you pick a goal.
          </p>
        </div>

        <div className="col-span-12 lg:col-span-5 py-16 lg:py-24 lg:pl-6">
          <div className="label mb-5">Magic link</div>

          {params.error ? (
            <div className="border-2 border-black p-4 mb-5" style={{ background: "var(--red-soft)" }}>
              <div className="label mb-1" style={{ color: "var(--red)" }}>Error</div>
              <div className="text-sm">{decodeURIComponent(params.error)}</div>
            </div>
          ) : null}
          {params.sent ? (
            <div className="border-2 border-black p-4 mb-5" style={{ background: "#00FF66" }}>
              <div className="label mb-1">Sent</div>
              <div className="text-sm">Check your inbox. The link signs you in.</div>
            </div>
          ) : null}

          <EmailForm />

          <p className="mt-6 label opacity-60 leading-relaxed">
            No password storage. Session cookie clears when you close the tab.
          </p>
        </div>
      </div>
    </section>
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
    <>
      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 lg:col-span-8 border-r border-black py-12 lg:pr-6">
            <div className="label mb-4">Step II / II · Risk mandate</div>
            <h1
              className="font-bold tracking-[-0.04em] leading-[0.9]"
              style={{ fontSize: "clamp(48px, 9vw, 120px)" }}
            >
              What kind of
              <br />
              <span className="inline-block px-3 -ml-1" style={{ background: "#00FF66" }}>
                client
              </span>{" "}
              are you?
            </h1>
          </div>

          <div className="col-span-12 lg:col-span-4 py-12 lg:pl-6 flex flex-col justify-end">
            <p className="text-[16px] leading-relaxed max-w-prose">
              Each mandate fixes the bands the agent must respect on every
              rebalance. You can switch later by editing your goal — the agent
              will tilt back into the new bands on its next run.
            </p>
            <p className="label mt-5">
              Signed in as <span className="ledger normal-case tracking-tight text-[10px] opacity-60">{userEmail ?? userId}</span>
            </p>
          </div>
        </div>
      </section>

      <GoalPicker initialGoal={row?.goal ?? null} />
    </>
  );
}

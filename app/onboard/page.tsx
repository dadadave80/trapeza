import Link from "next/link";
import { EmailForm } from "./email-form";
import { ARC_DISPLAY } from "@/lib/constants";
import { SessionGate } from "./session-gate";

// Statically prerendered for instant first-paint. The unauthed view (the
// 95% case for visitors arriving from the landing page) is server-rendered
// here without any Supabase call. <SessionGate /> mounts client-side,
// checks auth, and either redirects to /portfolio (wallet exists), swaps
// in the goal picker (authed but no wallet), or stays as-is (unauthed).
//
// This avoids the 1-2s server-side getUser() round-trip on every cold-load
// of /onboard — a brutal tax on the landing-page → onboard click path.

export const metadata = {
  title: "Sign in",
};

export default function OnboardPage() {
  return (
    <div className="flex-1 flex flex-col bg-white text-black">
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
        <SessionGate fallback={<UnauthedView />} />
      </main>
    </div>
  );
}

function UnauthedView() {
  return (
    <section className="border-b-2 border-black">
      <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
        <div className="col-span-12 lg:col-span-7 lg:border-r lg:border-black py-8 lg:py-24 lg:pr-6 order-2 lg:order-1">
          <div className="label mb-3 lg:mb-4">Step I / II · Sign in</div>
          <h1
            className="font-bold tracking-[-0.04em] leading-[0.9]"
            style={{ fontSize: "clamp(36px, 9vw, 128px)" }}
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
          <p className="mt-6 lg:mt-8 max-w-xl text-base lg:text-[17px] leading-relaxed">
            A magic link arrives by email — no password, no seed phrase. We
            mint your Circle wallet the moment you pick a goal.
          </p>
        </div>

        <div className="col-span-12 lg:col-span-5 py-10 lg:py-24 lg:pl-6 order-1 lg:order-2 border-b border-black lg:border-b-0">
          <div className="label mb-4 lg:mb-5">Magic link</div>
          <EmailForm />
          <p className="mt-6 label opacity-60 leading-relaxed">
            No password storage. Session cookie clears when you close the tab.
          </p>
        </div>
      </div>
    </section>
  );
}

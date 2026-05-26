import Link from "next/link";
import { EmailForm } from "./email-form";
import { SessionGate } from "./session-gate";

// Statically prerendered for instant first-paint. The unauthed view (the
// 95% case for visitors arriving from the landing page) is server-rendered
// here without any Supabase call. <SessionGate /> mounts client-side,
// checks auth, and either redirects to /portfolio (wallet exists), swaps
// in the goal picker (authed but no wallet), or stays as-is (unauthed).

export const metadata = {
  title: "Login",
};

export default function OnboardPage() {
  return (
    <div className="flex-1 flex flex-col">
      <header
        className="border-b border-dashed"
        style={{ borderColor: "var(--green-dim)" }}
      >
        <div className="mx-auto max-w-[1180px] px-5 py-3 grid grid-cols-[1fr_auto] items-center gap-4">
          <Link
            href="/"
            className="flex items-baseline gap-4 min-w-0"
            aria-label="Back to terminal home"
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
          <Link
            href="/"
            className="text-[11px] tracking-[0.25em] uppercase hover:text-[color:var(--green)]"
            style={{ color: "var(--green-dim)" }}
          >
            [← HOME]
          </Link>
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
    <section
      className="border-b border-dashed"
      style={{ borderColor: "var(--green-dim)" }}
    >
      <div className="mx-auto max-w-[1180px] px-5 py-10 lg:py-16 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 order-2 lg:order-1">
          <p className="section-marker mb-3">[STEP I / II] · LOGIN</p>
          <h1
            className="font-bold tracking-[-0.02em] leading-[0.92]"
            style={{
              fontSize: "clamp(36px, 8vw, 88px)",
              color: "var(--white)",
            }}
          >
            <span style={{ color: "var(--green-dim)" }}>&gt; </span>
            OPEN AN ACCOUNT
            <br />
            AT THE{" "}
            <span
              className="inline-block px-2"
              style={{
                background: "var(--green)",
                color: "var(--bg)",
              }}
            >
              AGORA&apos;S
            </span>
            <br />
            TABLE.
            <span className="cursor-blink" aria-hidden />
          </h1>
          <p
            className="mt-6 max-w-xl text-[14px] leading-relaxed"
            style={{ color: "var(--white)" }}
          >
            <span style={{ color: "var(--green)" }}>&gt;</span> A magic link
            arrives by email — no password, no seed phrase. The Circle wallet
            is minted the moment you pick a mandate.
          </p>
        </div>

        <div className="col-span-12 lg:col-span-5 order-1 lg:order-2">
          <p className="section-marker mb-3">MAGIC·LINK</p>
          <div
            className="border p-4"
            style={{
              borderColor: "var(--green-dim)",
              background: "var(--bg-soft)",
            }}
          >
            <EmailForm />
          </div>
          <p className="mt-3 label">
            NO PASSWORD STORAGE · SESSION CLEARS ON TAB CLOSE
          </p>
        </div>
      </div>
    </section>
  );
}

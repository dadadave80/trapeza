"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col">
      <header
        className="border-b border-dashed"
        style={{ borderColor: "var(--green-dim)" }}
      >
        <div className="mx-auto max-w-[1180px] px-5 py-3">
          <Link href="/" className="flex items-baseline gap-4">
            <span
              className="text-base font-bold tracking-[0.3em]"
              style={{ color: "var(--amber)" }}
            >
              TRAPEZA·TERM
            </span>
            <span className="text-[11px] text-[color:var(--green-dim)]">
              v0.5.0 · ARC-TESTNET
            </span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1180px] px-5 grid grid-cols-12 gap-6 flex-1 py-10">
        <div className="col-span-12 lg:col-span-8">
          <p className="section-marker mb-3" style={{ color: "var(--red)" }}>
            [ERR] · UNEXPECTED·EXCEPTION
          </p>
          <h1
            className="font-bold tracking-[-0.02em] leading-[0.92]"
            style={{
              fontSize: "clamp(40px, 9vw, 96px)",
              color: "var(--white)",
            }}
          >
            <span style={{ color: "var(--green-dim)" }}>&gt; </span>
            SOMETHING
            <br />
            <span
              className="inline-block px-2"
              style={{ background: "var(--red)", color: "var(--white)" }}
            >
              BROKE.
            </span>
            <span className="cursor-blink" aria-hidden />
          </h1>
          <p
            className="mt-6 text-[14px] max-w-prose leading-relaxed"
            style={{ color: "var(--white)" }}
          >
            <span style={{ color: "var(--green)" }}>&gt;</span> An unexpected
            error stopped this page from rendering. The agent loop is
            unaffected — only this screen is.
          </p>
          {error.digest ? (
            <p className="label mt-4">TRACE · {error.digest}</p>
          ) : null}
          {error.message ? (
            <pre
              className="mt-4 border p-3 text-[11px] whitespace-pre-wrap break-words max-w-prose"
              style={{
                borderColor: "var(--red)",
                background: "var(--red-soft)",
                color: "var(--white)",
              }}
            >
              {error.message}
            </pre>
          ) : null}
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-2 justify-end">
          <button
            onClick={reset}
            className="btn-acid w-full !text-[12px] !py-3"
          >
            [TRY AGAIN ↻]
          </button>
          <Link
            href="/portfolio"
            className="btn w-full text-center !text-[12px] !py-3"
          >
            [BACK TO PORTFOLIO]
          </Link>
          <Link
            href="/"
            className="btn w-full text-center !text-[12px] !py-3"
          >
            [BACK TO LANDING]
          </Link>
        </div>
      </main>
    </div>
  );
}

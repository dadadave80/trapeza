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
      <header className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 py-3 label-lg">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-base font-bold tracking-tight">Trapeza</span>
            <span className="opacity-60">▍ Treasury OS</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4 flex-1">
        <div className="col-span-12 lg:col-span-8 border-r border-black py-16 lg:pr-6">
          <div className="label mb-3">Error</div>
          <h1
            className="font-bold tracking-[-0.04em] leading-[0.9]"
            style={{ fontSize: "clamp(56px, 11vw, 144px)" }}
          >
            Something
            <br />
            <span className="inline-block px-3 -ml-1" style={{ background: "#FF0044", color: "#fff" }}>
              broke.
            </span>
          </h1>
          <p className="mt-6 text-lg max-w-prose">
            An unexpected error stopped this page from rendering. The agent
            loop is unaffected — only this screen is.
          </p>
          {error.digest ? (
            <p className="label opacity-60 mt-4">Trace · {error.digest}</p>
          ) : null}
          {error.message ? (
            <pre className="mt-6 border-2 border-black p-4 text-xs whitespace-pre-wrap break-words font-mono max-w-prose">
              {error.message}
            </pre>
          ) : null}
        </div>
        <div className="col-span-12 lg:col-span-4 py-16 lg:pl-6 flex flex-col gap-3 justify-end">
          <button onClick={reset} className="btn-acid w-full !py-4">
            ▶ Try again
          </button>
          <Link href="/portfolio" className="btn w-full text-center">
            ▢ Back to portfolio
          </Link>
          <Link href="/" className="btn w-full text-center">
            ▢ Back to landing
          </Link>
        </div>
      </main>
    </div>
  );
}

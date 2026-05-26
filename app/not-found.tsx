import Link from "next/link";

export default function NotFound() {
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
          <p className="section-marker mb-3" style={{ color: "var(--amber)" }}>
            [404] · NOT·FOUND
          </p>
          <h1
            className="font-bold tracking-[-0.02em] leading-[0.92]"
            style={{
              fontSize: "clamp(48px, 11vw, 128px)",
              color: "var(--white)",
            }}
          >
            <span style={{ color: "var(--green-dim)" }}>&gt; </span>
            NOTHING ON
            <br />
            <span
              className="inline-block px-2"
              style={{ background: "var(--green)", color: "var(--bg)" }}
            >
              THIS TABLE.
            </span>
            <span className="cursor-blink" aria-hidden />
          </h1>
          <p
            className="mt-6 text-[14px] max-w-prose leading-relaxed"
            style={{ color: "var(--white)" }}
          >
            <span style={{ color: "var(--green)" }}>&gt;</span> The agora&apos;s
            table holds USDC, USYC, EURC, and cirBTC — and nothing at the path
            you asked for.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-2 justify-end">
          <Link
            href="/portfolio"
            className="btn-acid w-full text-center !text-[12px] !py-3"
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

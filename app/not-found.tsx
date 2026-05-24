import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col bg-white text-black">
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
          <div className="label mb-3">404 / Not found</div>
          <h1
            className="font-bold tracking-[-0.04em] leading-[0.9]"
            style={{ fontSize: "clamp(72px, 14vw, 192px)" }}
          >
            Nothing on
            <br />
            <span className="inline-block px-3 -ml-1" style={{ background: "#00FF66" }}>
              this table.
            </span>
          </h1>
          <p className="mt-6 text-lg max-w-prose">
            The page you asked for doesn&apos;t exist. The agora&apos;s table
            holds USDC, EURC, and cirBTC — and nothing called <code className="ledger">{`{this path}`}</code>.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4 py-16 lg:pl-6 flex flex-col gap-3 justify-end">
          <Link href="/portfolio" className="btn-acid w-full text-center !py-4">
            ▶ Back to portfolio
          </Link>
          <Link href="/" className="btn w-full text-center">
            ▢ Back to landing
          </Link>
        </div>
      </main>
    </div>
  );
}

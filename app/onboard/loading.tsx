import Link from "next/link";

// Instant skeleton for /onboard. Prefetched by <Link href="/onboard">
// on the landing page, so navigation feels immediate while the server
// decides between the unauthed view and the goal picker.
export default function OnboardLoading() {
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

      <main className="flex-1">
        <section
          className="border-b border-dashed"
          style={{ borderColor: "var(--green-dim)" }}
        >
          <div className="mx-auto max-w-[1180px] px-5 py-10 grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-7 order-2 lg:order-1">
              <div className="section-marker mb-3 opacity-50">
                [STEP I / II] · BOOTING…
              </div>
              <div
                className="space-y-3"
                style={{ fontSize: "clamp(36px, 8vw, 88px)" }}
              >
                <SkeletonBar width="80%" />
                <SkeletonBar width="55%" />
                <SkeletonBar width="35%" />
              </div>
              <div className="mt-6 space-y-2 max-w-xl">
                <SkeletonBar height="14px" width="100%" />
                <SkeletonBar height="14px" width="92%" />
                <SkeletonBar height="14px" width="48%" />
              </div>
            </div>
            <div className="col-span-12 lg:col-span-5 order-1 lg:order-2">
              <div className="section-marker mb-3 opacity-50">MAGIC·LINK</div>
              <div
                className="border p-4 space-y-4"
                style={{
                  borderColor: "var(--green-dim)",
                  background: "var(--bg-soft)",
                }}
              >
                <div className="label opacity-50">EMAIL</div>
                <SkeletonBar height="40px" />
                <SkeletonBar height="44px" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SkeletonBar({
  height = "1em",
  width = "100%",
}: {
  height?: string;
  width?: string;
}) {
  return (
    <div
      className="animate-pulse border border-dashed"
      style={{
        height,
        width,
        borderColor: "var(--green-dim)",
        background: "var(--bg-soft)",
      }}
    />
  );
}

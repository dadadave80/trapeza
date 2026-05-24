import Link from "next/link";
import { ARC_DISPLAY } from "@/lib/constants";

// Instant skeleton for /onboard. Prefetched by <Link href="/onboard">
// on the landing page, so navigation now feels immediate while the
// server figures out whether to render the unauthed or authed view.
export default function OnboardLoading() {
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
        <section className="border-b-2 border-black">
          <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
            <div className="col-span-12 lg:col-span-7 lg:border-r lg:border-black py-8 lg:py-24 lg:pr-6 order-2 lg:order-1">
              <div className="label mb-3 lg:mb-4 opacity-50">Loading · Step I / II</div>
              <div className="space-y-3" style={{ fontSize: "clamp(36px, 9vw, 128px)" }}>
                <SkeletonBar width="80%" />
                <SkeletonBar width="55%" />
                <SkeletonBar width="35%" />
              </div>
              <div className="mt-6 lg:mt-8 space-y-2 max-w-xl">
                <SkeletonBar height="16px" width="100%" />
                <SkeletonBar height="16px" width="92%" />
                <SkeletonBar height="16px" width="48%" />
              </div>
            </div>
            <div className="col-span-12 lg:col-span-5 py-10 lg:py-24 lg:pl-6 order-1 lg:order-2 border-b border-black lg:border-b-0">
              <div className="label mb-4 lg:mb-5 opacity-50">Magic link</div>
              <div className="space-y-4">
                <div className="label opacity-30">Email</div>
                <SkeletonBar height="48px" />
                <SkeletonBar height="56px" />
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
      className="bg-black/5 animate-pulse border border-black/10"
      style={{ height, width }}
    />
  );
}

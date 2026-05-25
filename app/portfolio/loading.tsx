import Link from "next/link";
import { ARC_DISPLAY } from "@/lib/constants";

// Instant skeleton for /portfolio. The real dashboard takes 500-1500ms
// to render server-side (auth + DB + initial balance fetch); this masks
// the wait so prefetched navigation feels immediate.
export default function PortfolioLoading() {
  return (
    <div className="flex-1">
      <header className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <Link
            href="/"
            className="col-span-6 sm:col-span-3 border-r border-black py-3 label-lg flex items-center"
          >
            <span className="text-base font-bold tracking-tight">Trapeza</span>
            <span className="ml-2 hidden sm:inline opacity-60">▍ Treasury OS</span>
          </Link>
          <div className="col-span-6 sm:col-span-9 py-3 flex items-center justify-end label opacity-50">
            Loading…
          </div>
        </div>
      </header>

      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <div className="col-span-12 lg:col-span-8 lg:border-r lg:border-black py-10 lg:pr-6">
            <div className="label mb-3 opacity-50">01 / Portfolio</div>
            <SkeletonBar height="clamp(56px, 14vw, 168px)" />
            <div className="grid grid-cols-3 gap-x-4 mt-6 pt-4 border-t border-black">
              <SkeletonStat />
              <SkeletonStat />
              <SkeletonStat />
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4 py-10 lg:pl-6 space-y-4">
            <div className="label opacity-50">02 / Regime</div>
            <SkeletonBar height="64px" width="220px" />
            <SkeletonBar height="14px" width="160px" />
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 py-10">
          <div className="label mb-6 opacity-50">03 / Allocation</div>
          <div className="space-y-4">
            <SkeletonBar height="36px" />
            <SkeletonBar height="36px" />
            <SkeletonBar height="36px" />
          </div>
        </div>
      </section>

      <footer>
        <div className="mx-auto max-w-[1280px] px-6 py-4 label opacity-50">
          Trapeza ▍ Treasury OS ▍ {ARC_DISPLAY.name} · chainId {ARC_DISPLAY.chainId}
        </div>
      </footer>
    </div>
  );
}

function SkeletonBar({ height = "1em", width = "100%" }: { height?: string; width?: string }) {
  return (
    <div className="bg-black/5 animate-pulse border border-black/10" style={{ height, width }} />
  );
}

function SkeletonStat() {
  return (
    <div>
      <div className="label mb-1 opacity-50">·</div>
      <SkeletonBar height="22px" width="80%" />
    </div>
  );
}

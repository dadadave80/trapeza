import Link from "next/link";

export default function TraceLoading() {
  return (
    <div className="flex-1">
      <div className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
          <Link
            href="/"
            className="col-span-6 sm:col-span-3 border-r border-black py-3 label-lg flex items-center"
          >
            <span className="text-base font-bold tracking-tight">Trapeza</span>
            <span className="ml-2 hidden sm:inline opacity-60">▍ Treasury OS</span>
          </Link>
          <div className="col-span-6 sm:col-span-9 py-3 flex items-center justify-end label opacity-50">
            Loading decision…
          </div>
        </div>
      </div>

      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4 py-12">
          <div className="col-span-12 lg:col-span-8 lg:border-r lg:border-black lg:pr-6 space-y-5">
            <div className="label opacity-50">Decision · loading</div>
            <div
              className="bg-black/5 animate-pulse border border-black/10"
              style={{ height: "clamp(56px, 11vw, 144px)" }}
            />
          </div>
          <div className="col-span-12 lg:col-span-4 lg:pl-6 flex flex-col gap-3 justify-end mt-6 lg:mt-0">
            <div className="bg-black/5 animate-pulse border border-black/10 h-9 w-32" />
            <div className="bg-black/5 animate-pulse border border-black/10 h-9 w-28" />
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-[1280px] px-6 py-12 space-y-3">
          <div className="bg-black/5 animate-pulse border border-black/10 h-7 w-full" />
          <div className="bg-black/5 animate-pulse border border-black/10 h-7 w-[92%]" />
          <div className="bg-black/5 animate-pulse border border-black/10 h-7 w-[78%]" />
          <div className="bg-black/5 animate-pulse border border-black/10 h-7 w-[55%]" />
        </div>
      </section>
    </div>
  );
}

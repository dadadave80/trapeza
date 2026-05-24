import Link from "next/link";

// Brutalist top strip — black wordmark on white, vertical column dividers,
// every cell a tracked-uppercase microcaption. Used on every authed page.
export function Masthead({
  right,
}: {
  right?: React.ReactNode;
}) {
  return (
    <div className="border-b-2 border-black">
      <div className="mx-auto max-w-[1280px] px-6 grid grid-cols-12 gap-x-4">
        <Link
          href="/"
          className="col-span-4 sm:col-span-3 border-r border-black py-3 label-lg flex items-center"
        >
          <span className="text-base font-bold tracking-tight">Trapeza</span>
          <span className="ml-2 hidden sm:inline opacity-60">▍ Treasury OS</span>
        </Link>
        <div className="col-span-8 sm:col-span-9 py-3 flex items-center justify-end gap-4 label">
          {right}
        </div>
      </div>
    </div>
  );
}

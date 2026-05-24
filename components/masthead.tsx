import Link from "next/link";

// Editorial masthead used at the top of every authed page. Reads like the
// nameplate of a private bank report: the trade name, the etymology, and a
// dateline-style ribbon on the right.
export function Masthead({
  right,
}: {
  right?: React.ReactNode;
}) {
  const now = new Date();
  const dateline = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="border-b border-[color:var(--ink)] dark:border-[color:var(--ivory)]/30 bg-background">
      <div className="mx-auto max-w-[1080px] px-6 sm:px-10 py-5 flex items-baseline justify-between gap-6">
        <Link href="/" className="group flex items-baseline gap-3">
          <span
            className="font-display text-2xl sm:text-[28px] tracking-tight text-[color:var(--ink)] dark:text-[color:var(--ivory)]"
            style={{ fontVariationSettings: '"opsz" 36' }}
          >
            Trapeza
          </span>
          <span className="kicker hidden sm:inline">
            Τράπεζα · the agora&apos;s table
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="kicker hidden md:inline">{dateline}</span>
          {right}
        </div>
      </div>
    </div>
  );
}

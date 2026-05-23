import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/db/client";
import { Dashboard } from "./dashboard";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/onboard");

  const { data: row } = await supabase
    .from("users")
    .select("arc_address, goal, circle_wallet_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!row?.arc_address) redirect("/onboard");

  return (
    <Dashboard
      address={row.arc_address as `0x${string}`}
      goal={(row.goal ?? "balanced") as "conservative" | "balanced" | "aggressive"}
      email={user.email ?? null}
    />
  );
}

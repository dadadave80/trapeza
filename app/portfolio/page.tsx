import { redirect } from "next/navigation";
import { supabaseServer, supabaseService } from "@/lib/db/client";
import { Dashboard } from "./dashboard";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/onboard");

  const svc = supabaseService();
  const [{ data: row, error }, { data: portfolio }] = await Promise.all([
    svc
      .from("users")
      .select("arc_address, goal, circle_wallet_id")
      .eq("id", user.id)
      .maybeSingle(),
    svc
      .from("portfolios")
      .select("last_checked_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (error) {
    console.error("[portfolio] user row read failed:", error);
    redirect("/onboard?error=" + encodeURIComponent(error.message));
  }
  if (!row?.arc_address) {
    console.warn("[portfolio] no wallet for user", user.id, "row=", row);
    redirect("/onboard");
  }

  return (
    <Dashboard
      address={row.arc_address as `0x${string}`}
      goal={(row.goal ?? "balanced") as "conservative" | "balanced" | "aggressive"}
      email={user.email ?? null}
      lastCheckedAt={portfolio?.last_checked_at ?? null}
    />
  );
}

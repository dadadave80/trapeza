import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCirBtcUsdPrice } from "@/lib/agent/pricing";

export const dynamic = "force-dynamic";

// Diagnostic: verifies Supabase URL + anon key + service role key end-to-end
// against the actual schema. Safe to expose — returns masked key prefixes
// only. Used both as a smoke test after env changes and to confirm RLS
// behavior (the anon row count vs service-role row count tells you whether
// RLS is enabled on the table).
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const result: Record<string, unknown> = {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: url ?? null,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anon ? mask(anon) : null,
      SUPABASE_SERVICE_ROLE_KEY: service ? mask(service) : null,
      CIRCLE_API_KEY: maskEnv(process.env.CIRCLE_API_KEY),
      CIRCLE_ENTITY_SECRET: maskEnv(process.env.CIRCLE_ENTITY_SECRET),
      CIRCLE_WALLET_SET_ID: maskEnv(process.env.CIRCLE_WALLET_SET_ID),
      ARC_USDC_ADDRESS: process.env.ARC_USDC_ADDRESS ?? null,
      ARC_EURC_ADDRESS: process.env.ARC_EURC_ADDRESS ?? null,
      ARC_CIRBTC_ADDRESS: process.env.ARC_CIRBTC_ADDRESS ?? null,
    },
  };

  if (!url || !anon || !service) {
    return NextResponse.json(
      { ...result, error: "missing one or more Supabase env vars" },
      { status: 500 },
    );
  }

  // Test each table with both keys; compare counts to spot RLS-blocked reads.
  const tables = ["users", "portfolios", "decisions"] as const;

  const anonClient = createClient(url, anon, { auth: { persistSession: false } });
  const svcClient = createClient(url, service, { auth: { persistSession: false } });

  const tableResults: Record<string, unknown> = {};
  for (const t of tables) {
    const [anonRes, svcRes] = await Promise.all([
      anonClient.from(t).select("*", { count: "exact", head: true }),
      svcClient.from(t).select("*", { count: "exact", head: true }),
    ]);
    tableResults[t] = {
      anon: anonRes.error
        ? { ok: false, error: anonRes.error.message }
        : { ok: true, count: anonRes.count ?? 0 },
      service: svcRes.error
        ? { ok: false, error: svcRes.error.message }
        : { ok: true, count: svcRes.count ?? 0 },
      rlsLikely:
        !anonRes.error &&
        !svcRes.error &&
        (svcRes.count ?? 0) > 0 &&
        (anonRes.count ?? 0) === 0,
    };
  }
  result.tables = tableResults;

  // cirBTC price oracle sanity check.
  try {
    const price = await getCirBtcUsdPrice();
    result.pricing = { cirbtc: price };
  } catch (err) {
    result.pricing = {
      cirbtc: { ok: false, error: err instanceof Error ? err.message : String(err) },
    };
  }

  return NextResponse.json(result);
}

function mask(s: string): string {
  if (s.length <= 12) return "***";
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function maskEnv(s: string | undefined): string | null {
  if (!s) return null;
  return mask(s);
}

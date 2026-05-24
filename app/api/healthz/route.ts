import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPrices } from "@/lib/agent/pricing";
import { MODELS } from "@/lib/agent/llm";

export const dynamic = "force-dynamic";

// Diagnostic: verifies Supabase URL + anon key + service role key, the
// pricing oracle, and the Groq LLM provider end-to-end. Safe to expose —
// returns only masked key prefixes (no full key material).
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
      GROQ_API_KEY: maskEnv(process.env.GROQ_API_KEY),
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

  // Price oracle sanity check.
  try {
    result.pricing = await getPrices();
  } catch (err) {
    result.pricing = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  // Groq model availability.
  result.llm = await checkGroq();

  return NextResponse.json(result);
}

async function checkGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { ok: false, error: "missing GROQ_API_KEY" };

  const targets = { fast: MODELS.fast, heavy: MODELS.heavy };
  const results: Record<string, unknown> = { provider: "groq", configured: targets };

  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      results.list = { ok: false, status: res.status, body: (await res.text()).slice(0, 300) };
      return results;
    }
    const data = (await res.json()) as {
      data?: Array<{ id?: string; active?: boolean; context_window?: number }>;
    };
    const ids = (data.data ?? [])
      .filter((m) => m.active !== false)
      .map((m) => m.id)
      .filter((x): x is string => !!x)
      .sort();
    results.availableModels = ids;
    const present = new Set(ids);
    results.fastAvailable = present.has(targets.fast);
    results.heavyAvailable = present.has(targets.heavy);
  } catch (err) {
    results.list = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  return results;
}

function mask(s: string): string {
  if (s.length <= 12) return "***";
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function maskEnv(s: string | undefined): string | null {
  if (!s) return null;
  return mask(s);
}

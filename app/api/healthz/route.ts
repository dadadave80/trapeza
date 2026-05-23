import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Diagnostic: verifies that the Supabase URL + anon key + service role key
// actually work, and that the public.users table exists. Safe to expose
// publicly — returns only error messages and short key prefixes (no full
// key material).
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const result: Record<string, unknown> = {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: url ?? null,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anon ? mask(anon) : null,
      SUPABASE_SERVICE_ROLE_KEY: service ? mask(service) : null,
    },
  };

  if (!url || !anon || !service) {
    return NextResponse.json(
      { ...result, error: "missing one or more Supabase env vars" },
      { status: 500 },
    );
  }

  // Test the ANON key with a "select count" against a system endpoint.
  try {
    const anonClient = createClient(url, anon, { auth: { persistSession: false } });
    const { error } = await anonClient.from("users").select("id", { count: "exact", head: true });
    result.anon = error ? { ok: false, error: error.message } : { ok: true };
  } catch (err) {
    result.anon = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  // Test the SERVICE ROLE key similarly.
  try {
    const svcClient = createClient(url, service, { auth: { persistSession: false } });
    const { error } = await svcClient.from("users").select("id", { count: "exact", head: true });
    result.serviceRole = error ? { ok: false, error: error.message } : { ok: true };
  } catch (err) {
    result.serviceRole = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json(result);
}

// Returns "<6 leading chars>…<4 trailing chars>" — safe to log.
function mask(s: string): string {
  if (s.length <= 12) return "***";
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

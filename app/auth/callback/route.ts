import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/client";

export const dynamic = "force-dynamic";

// Supabase magic-link callback. The signed-in client hits this with a `code`
// query param; we exchange it for a session cookie and redirect to `next`.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/onboard";

  if (!code) {
    return NextResponse.redirect(new URL("/onboard?error=missing_code", url.origin));
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/onboard?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

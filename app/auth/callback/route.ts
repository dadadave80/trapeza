import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/client";

export const dynamic = "force-dynamic";

// Supabase magic-link callback. Handles both flows:
// - PKCE (default with @supabase/ssr): `?code=xxx` → exchangeCodeForSession
// - OTP/token_hash (legacy email template): `?token_hash=xxx&type=magiclink` → verifyOtp
// Plus implicit flow (`#access_token=...`) is handled client-side by
// /auth/callback/page.tsx (not present yet — add only if you hit it).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as
    | "magiclink"
    | "signup"
    | "recovery"
    | "invite"
    | "email"
    | null;
  const next = url.searchParams.get("next") ?? "/onboard";

  if (!code && !tokenHash) {
    return NextResponse.redirect(
      new URL(`/onboard?error=${encodeURIComponent("missing code or token_hash")}`, url.origin),
    );
  }

  const supabase = await supabaseServer();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/onboard?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }
    return NextResponse.redirect(new URL(next, url.origin));
  }

  // token_hash flow
  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type ?? "magiclink",
    });
    if (error) {
      return NextResponse.redirect(
        new URL(`/onboard?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }
    return NextResponse.redirect(new URL(next, url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

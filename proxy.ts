import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Supabase session-refresh proxy. Only runs on routes that NEED an authed
// session — calling getUser() on every request adds 300-500ms (network hop
// to Supabase auth) which is brutal on cold starts of the proxy lambda.
//
// Allow-list approach: matcher only catches the routes whose UX actually
// depends on a fresh session cookie. /onboard, /, /demo, /api/webhooks,
// /api/healthz, /api/agent/run (bearer-authed cron) all run without the
// proxy.

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    "/portfolio/:path*",
    "/trace/:path*",
    "/api/wallet/:path*",
    "/api/portfolio/:path*",
    "/api/trace/:path*",
    "/api/agent/trigger/:path*",
    "/api/agent/initialize/:path*",
  ],
};

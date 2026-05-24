import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Standard @supabase/ssr session-refresh proxy. Calls getUser() on every
// request so the session cookie gets refreshed before it expires — without
// this, magic-link sessions silently die mid-demo and the user starts
// seeing 401s on actions that should work.
//
// In Next 16 this lives in proxy.ts (was middleware.ts pre-16) and exports
// `proxy`. Skipped for static assets, Next internals, demo, and the
// public mockup tree to keep request volume reasonable.

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

  // Triggers cookie refresh if the JWT is nearing expiry.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, icon, opengraph-image
     * - public /mockups/* design exploration (no auth, no need)
     * - any file with an extension (.svg, .png, .jpg, .css, .js…)
     */
    "/((?!_next/static|_next/image|favicon.ico|icon|opengraph-image|mockups|.*\\..*).*)",
  ],
};

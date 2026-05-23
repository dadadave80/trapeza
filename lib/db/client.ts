import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          // In Next 15+, cookieStore.set() throws when called from a Server
          // Component (only Route Handlers, Server Actions, and middleware
          // can set cookies). Silently no-op there — the cookie will be set
          // by /auth/callback or another route handler that does have write
          // access. Swallowing this is the standard @supabase/ssr pattern.
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // intentionally ignored
          }
        },
      },
    },
  );
}

export function supabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service-role env");
  return createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

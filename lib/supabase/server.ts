import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv, MISSING_ENV_MESSAGE } from "./env";

// Supabase client for Server Components, Server Actions and Route Handlers.
export async function createClient() {
  const env = supabaseEnv();
  if (!env) throw new Error(MISSING_ENV_MESSAGE);

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component, where cookies can't be set.
          // Safe to ignore: the middleware refreshes the session instead.
        }
      },
    },
  });
}

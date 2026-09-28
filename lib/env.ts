/**
 * Centralised environment access.
 *
 * - Public values are safe to ship to the browser (Next inlines NEXT_PUBLIC_*).
 * - The service-role key is read lazily and only ever on the server. It is never
 *   imported by client components (see lib/supabase/admin.ts).
 */

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/** True when the minimum public configuration exists. Used by the /setup page. */
export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}

/** Server-only. Throws loudly rather than silently running unprivileged. */
export function getServiceRoleKey(): string {
  if (typeof window !== "undefined") {
    throw new Error("Service role key must never be accessed in the browser.");
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }
  return key;
}

"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { publicEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Browser-side Supabase client (anon key only). Used for auth flows and for
 * uploading files straight to Storage with a signed upload URL. All data
 * mutations go through server actions, never directly from here.
 */
export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  }
  return browserClient;
}

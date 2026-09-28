import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { getServiceRoleKey, publicEnv } from "@/lib/env";

/**
 * Service-role client. BYPASSES Row Level Security.
 *
 * Only used from trusted server code for operations the Auth API forbids to
 * normal users: creating auth users, deleting auth users, admin password resets.
 * Every caller MUST have already verified the actor holds the relevant admin
 * permission (see lib/auth/guards.ts → requirePermission).
 *
 * `import "server-only"` guarantees this module can never be bundled for the
 * browser.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(publicEnv.supabaseUrl, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

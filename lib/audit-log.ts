import "server-only";

import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";

/**
 * Writes an audit-log entry via the SECURITY DEFINER `log_action` function.
 * The actor is derived from the JWT inside Postgres, so callers cannot spoof it.
 * Failures are logged, never thrown — an audit-log hiccup must not roll back
 * the user's action.
 */
export async function logAction(
  supabase: ServerSupabaseClient,
  action: string,
  entity?: { type: string; id: string | number | null | undefined },
  metadata: Record<string, Json | undefined> = {},
) {
  const clean: Record<string, Json> = {};
  for (const [k, v] of Object.entries(metadata)) if (v !== undefined) clean[k] = v;

  const { error } = await supabase.rpc("log_action", {
    p_action: action,
    p_entity_type: entity?.type ?? null,
    p_entity_id: entity?.id == null ? null : String(entity.id),
    p_metadata: clean,
  });
  if (error) console.error("[audit-log] failed to write", action, error.message);
}

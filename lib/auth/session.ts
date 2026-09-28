import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { EmployeeRow, ProfileRow } from "@/lib/types/database";
import { hasAnyPermission, hasPermission, type PermissionKey } from "./permissions";

export type CurrentUser = {
  id: string;
  email: string;
  profile: ProfileRow;
  employee: EmployeeRow | null;
  roles: { id: string; name: string }[];
  permissions: Set<string>;
  can: (key: PermissionKey) => boolean;
  canAny: (keys: readonly PermissionKey[]) => boolean;
  isManager: boolean;
};

/**
 * Resolves the signed-in user with profile, employee record, roles and the
 * effective permission set. Cached per request via React cache() so layouts,
 * pages and actions can all call it without redundant queries.
 *
 * Returns null when there is no valid session or the account is deactivated.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const [profileRes, employeeRes, rolesRes, permsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("employees").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role:roles(id, name)").eq("user_id", user.id),
    supabase.rpc("get_my_permissions"),
  ]);

  if (!profileRes.data || !profileRes.data.is_active) return null;

  const roles = (rolesRes.data ?? [])
    .map((r) => r.role)
    .filter((r): r is { id: string; name: string } => Boolean(r));
  const permissions = new Set<string>((permsRes.data as string[] | null) ?? []);

  return {
    id: user.id,
    email: profileRes.data.email,
    profile: profileRes.data,
    employee: employeeRes.data ?? null,
    roles,
    permissions,
    can: (key) => hasPermission(permissions, key),
    canAny: (keys) => hasAnyPermission(permissions, keys),
    isManager: Boolean(employeeRes.data?.is_manager),
  };
});

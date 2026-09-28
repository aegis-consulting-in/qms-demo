import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PaginationInput } from "@/lib/validation/common";

export async function listUsers(filters: PaginationInput & { status?: "active" | "inactive" | "all" }) {
  const supabase = await createClient();
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let q = supabase
    .from("profiles")
    .select(`*, user_roles(role:roles(id, name)), employee:employees(id, employee_code, first_name, last_name)`, {
      count: "exact",
    });
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_]/g, "")}%`;
    q = q.or(`email.ilike.${term},full_name.ilike.${term}`);
  }
  if (filters.status === "active") q = q.eq("is_active", true);
  if (filters.status === "inactive") q = q.eq("is_active", false);
  q = q.order("full_name", { ascending: filters.dir !== "desc" }).range(from, to);

  const { data, error, count } = await q;
  if (error) throw error;
  return {
    rows: (data ?? []).map((row) => ({
      ...row,
      roles: row.user_roles.map((ur) => ur.role).filter((r): r is { id: string; name: string } => Boolean(r)),
    })),
    total: count ?? 0,
  };
}

export async function getUserWithRoles(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(`*, user_roles(role:roles(id, name)), employee:employees(id, employee_code, first_name, last_name)`)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    roles: data.user_roles.map((ur) => ur.role).filter((r): r is { id: string; name: string } => Boolean(r)),
  };
}

export async function getRolesWithPermissions() {
  const supabase = await createClient();
  const [roles, rolePerms, userCounts] = await Promise.all([
    supabase.from("roles").select("*").order("name"),
    supabase.from("role_permissions").select("role_id, permission_id"),
    supabase.from("user_roles").select("role_id"),
  ]);
  if (roles.error) throw roles.error;
  if (rolePerms.error) throw rolePerms.error;

  const permsByRole = new Map<string, string[]>();
  for (const rp of rolePerms.data) (permsByRole.get(rp.role_id) ?? permsByRole.set(rp.role_id, []).get(rp.role_id)!).push(rp.permission_id);
  const counts = new Map<string, number>();
  for (const ur of userCounts.data ?? []) counts.set(ur.role_id, (counts.get(ur.role_id) ?? 0) + 1);

  return roles.data.map((r) => ({
    ...r,
    permissionIds: permsByRole.get(r.id) ?? [],
    userCount: counts.get(r.id) ?? 0,
  }));
}

export async function getAllSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("system_settings").select("*").order("key");
  if (error) throw error;
  return data;
}

export async function listAuditLogs(filters: { page: number; action?: string; entityType?: string; actor?: string }, pageSize = 50) {
  const supabase = await createClient();
  const from = (filters.page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase.from("audit_logs").select("*", { count: "exact" });
  if (filters.action) q = q.ilike("action", `%${filters.action}%`);
  if (filters.entityType) q = q.eq("entity_type", filters.entityType);
  if (filters.actor) q = q.ilike("actor_email", `%${filters.actor}%`);
  q = q.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: data, total: count ?? 0, pageSize };
}

export async function getAdminStats() {
  const supabase = await createClient();
  const [users, activeUsers, roles, logs] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("roles").select("id", { count: "exact", head: true }),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }),
  ]);
  return { users: users.count ?? 0, activeUsers: activeUsers.count ?? 0, roles: roles.count ?? 0, logs: logs.count ?? 0 };
}

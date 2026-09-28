import "server-only";

import type { QueryData } from "@supabase/supabase-js";
import { createClient, type ServerSupabaseClient } from "@/lib/supabase/server";
import type { PaginationInput } from "@/lib/validation/common";

/** Manager is loaded in a second query — PostgREST cannot always resolve the self-FK embed. */
export const EMPLOYEE_SELECT = `
  *,
  department:departments(id, name),
  job_title:job_titles(id, name)
` as const;

export type EmployeeListFilters = PaginationInput & {
  departmentId?: string;
  status?: "active" | "inactive" | "all";
};

const SORTABLE: Record<string, string> = {
  name: "first_name",
  code: "employee_code",
  email: "email",
  joined: "joining_date",
  created: "created_at",
};

type ManagerLite = { id: string; first_name: string; last_name: string };

async function managersById(supabase: ServerSupabaseClient, ids: Array<string | null | undefined>) {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const map = new Map<string, ManagerLite>();
  if (!unique.length) return map;
  const { data, error } = await supabase.from("employees").select("id, first_name, last_name").in("id", unique);
  if (error) throw error;
  for (const row of data ?? []) map.set(row.id, row);
  return map;
}

const employeeQuery = (supabase: ServerSupabaseClient) => supabase.from("employees").select(EMPLOYEE_SELECT);
type RawEmployee = QueryData<ReturnType<typeof employeeQuery>>[number];

function normalizeEmployee(row: RawEmployee, manager: ManagerLite | null) {
  return { ...row, manager };
}
export type EmployeeWithRelations = ReturnType<typeof normalizeEmployee>;

export async function listEmployees(filters: EmployeeListFilters) {
  const supabase = await createClient();
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let q = supabase.from("employees").select(EMPLOYEE_SELECT, { count: "exact" });

  if (filters.q) {
    const term = `%${filters.q.replace(/[%_]/g, "")}%`;
    q = q.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},employee_code.ilike.${term}`);
  }
  if (filters.departmentId) q = q.eq("department_id", filters.departmentId);
  if (filters.status === "active" || !filters.status) q = q.eq("is_active", true);
  if (filters.status === "inactive") q = q.eq("is_active", false);

  const sortCol = SORTABLE[filters.sort ?? "name"] ?? "first_name";
  q = q.order(sortCol, { ascending: filters.dir !== "desc" }).range(from, to);
  if (sortCol === "first_name") q = q.order("last_name", { ascending: filters.dir !== "desc" });

  const { data, error, count } = await q;
  if (error) throw error;
  const managers = await managersById(
    supabase,
    (data ?? []).map((r) => r.manager_id),
  );
  return {
    rows: (data ?? []).map((row) => normalizeEmployee(row, row.manager_id ? (managers.get(row.manager_id) ?? null) : null)),
    total: count ?? 0,
  };
}

export async function getEmployee(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("employees").select(EMPLOYEE_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const managers = await managersById(supabase, [data.manager_id]);
  return normalizeEmployee(data, data.manager_id ? (managers.get(data.manager_id) ?? null) : null);
}

export async function getEmployeeRoles(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_roles").select("role:roles(id, name)").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.role).filter((r): r is { id: string; name: string } => Boolean(r));
}

export async function getEmployeeTrainingHistory(employeeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_assignments")
    .select(
      `*, training:trainings(id, name, code, level:training_levels(name), status:training_statuses(name))`,
    )
    .eq("employee_id", employeeId)
    .order("assigned_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getDirectReports(employeeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, employee_code, first_name, last_name, email, is_active, job_title:job_titles(name)")
    .eq("manager_id", employeeId)
    .order("first_name");
  if (error) throw error;
  return data;
}

export async function getEmployeeStats() {
  const supabase = await createClient();
  const [all, active, managers] = await Promise.all([
    supabase.from("employees").select("id", { count: "exact", head: true }),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("is_manager", true),
  ]);
  return { total: all.count ?? 0, active: active.count ?? 0, managers: managers.count ?? 0 };
}

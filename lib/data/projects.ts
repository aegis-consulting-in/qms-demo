import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PaginationInput } from "@/lib/validation/common";

export const PROJECT_SELECT = `
  *,
  manager:employees!manager_id(id, first_name, last_name, email)
` as const;

export type ProjectListFilters = PaginationInput & { status?: string; priority?: string };

export async function listProjects(filters: ProjectListFilters) {
  const supabase = await createClient();
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let q = supabase.from("projects").select(PROJECT_SELECT, { count: "exact" }).is("deleted_at", null);
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_]/g, "")}%`;
    q = q.or(`name.ilike.${term},code.ilike.${term},description.ilike.${term}`);
  }
  if (filters.status) q = q.eq("status", filters.status as never);
  if (filters.priority) q = q.eq("priority", filters.priority as never);

  const sortCol = ({ name: "name", code: "code", start: "start_date", status: "status", priority: "priority" } as Record<string, string>)[
    filters.sort ?? "name"
  ] ?? "name";
  q = q.order(sortCol, { ascending: filters.dir !== "desc" }).range(from, to);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: data, total: count ?? 0 };
}

export async function getProject(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProjectMembers(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_members")
    .select(`*, employee:employees(id, employee_code, first_name, last_name, email, job_title:job_titles(name))`)
    .eq("project_id", projectId)
    .order("added_at");
  if (error) throw error;
  return data;
}

export async function getProjectStats() {
  const supabase = await createClient();
  const [total, active, completed] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("projects").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "active"),
    supabase.from("projects").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "completed"),
  ]);
  return { total: total.count ?? 0, active: active.count ?? 0, completed: completed.count ?? 0 };
}

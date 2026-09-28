import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PaginationInput } from "@/lib/validation/common";

export const TRAINING_SELECT = `
  *,
  level:training_levels(id, name),
  status:training_statuses(id, name)
` as const;

export const ASSIGNMENT_SELECT = `
  *,
  training:trainings(id, name, code, duration_hours, level:training_levels(name), status:training_statuses(name)),
  employee:employees(id, employee_code, first_name, last_name, email, department:departments(name))
` as const;

export type TrainingListFilters = PaginationInput & {
  levelId?: string;
  statusId?: string;
  includeDeleted?: boolean;
};

export async function listTrainings(filters: TrainingListFilters) {
  const supabase = await createClient();
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let q = supabase.from("trainings").select(TRAINING_SELECT, { count: "exact" });
  if (!filters.includeDeleted) q = q.is("deleted_at", null);
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_]/g, "")}%`;
    q = q.or(`name.ilike.${term},code.ilike.${term},description.ilike.${term}`);
  }
  if (filters.levelId) q = q.eq("level_id", filters.levelId);
  if (filters.statusId) q = q.eq("status_id", filters.statusId);

  const sortCol = ({ name: "name", code: "code", created: "created_at", hours: "duration_hours" } as Record<string, string>)[
    filters.sort ?? "name"
  ] ?? "name";
  q = q.order(sortCol, { ascending: filters.dir !== "desc" }).range(from, to);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: data, total: count ?? 0 };
}

export async function getTraining(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("trainings").select(TRAINING_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTrainingAssignments(trainingId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("training_id", trainingId)
    .order("assigned_date", { ascending: false });
  if (error) throw error;
  return data;
}

/** Assignments for the signed-in employee. */
export async function getMyAssignments(employeeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("employee_id", employeeId)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

/** Assignments for everyone in the manager's reporting chain (RLS enforces membership). */
export async function getTeamAssignments(managerEmployeeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_assignments")
    .select(ASSIGNMENT_SELECT)
    .neq("employee_id", managerEmployeeId)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function listAllAssignments(filters: PaginationInput & { status?: string }) {
  const supabase = await createClient();
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  let q = supabase.from("training_assignments").select(ASSIGNMENT_SELECT, { count: "exact" });
  if (filters.status) q = q.eq("status", filters.status as never);
  q = q.order("due_date", { ascending: true, nullsFirst: false }).range(from, to);
  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: data, total: count ?? 0 };
}

export async function getTrainingStats() {
  const supabase = await createClient();
  const [total, assignments, overdue, completed] = await Promise.all([
    supabase.from("trainings").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("training_assignments").select("id", { count: "exact", head: true }),
    supabase.from("training_assignments").select("id", { count: "exact", head: true }).eq("status", "overdue"),
    supabase.from("training_assignments").select("id", { count: "exact", head: true }).eq("status", "completed"),
  ]);
  return {
    trainings: total.count ?? 0,
    assignments: assignments.count ?? 0,
    overdue: overdue.count ?? 0,
    completed: completed.count ?? 0,
  };
}

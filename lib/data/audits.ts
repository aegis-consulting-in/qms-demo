import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PaginationInput } from "@/lib/validation/common";

export const AUDIT_SELECT = `
  *,
  department:departments(id, name),
  auditor:employees!auditor_id(id, first_name, last_name, email)
` as const;

export async function listAudits(filters: PaginationInput & { status?: string; departmentId?: string; auditType?: string }) {
  const supabase = await createClient();
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let q = supabase.from("audits").select(AUDIT_SELECT, { count: "exact" }).is("deleted_at", null);
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_]/g, "")}%`;
    q = q.or(`title.ilike.${term},code.ilike.${term},process_name.ilike.${term}`);
  }
  if (filters.status) q = q.eq("status", filters.status as never);
  if (filters.departmentId) q = q.eq("department_id", filters.departmentId);
  if (filters.auditType) q = q.eq("audit_type", filters.auditType as never);

  const sortCol = ({ date: "audit_date", title: "title", code: "code", status: "status" } as Record<string, string>)[
    filters.sort ?? "date"
  ] ?? "audit_date";
  q = q.order(sortCol, { ascending: filters.dir === "asc", nullsFirst: false }).range(from, to);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: data, total: count ?? 0 };
}

export async function getAudit(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("audits").select(AUDIT_SELECT).eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAuditFindings(auditId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("audit_findings").select("*").eq("audit_id", auditId).order("created_at");
  if (error) throw error;
  return data;
}

export async function getCorrectiveActions(auditId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("corrective_actions")
    .select(`*, owner:employees!owner_id(id, first_name, last_name), finding:audit_findings(id, title)`)
    .eq("audit_id", auditId)
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function getAuditStats() {
  const supabase = await createClient();
  const [total, inProgress, openFindings, openActions] = await Promise.all([
    supabase.from("audits").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("audits").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "in_progress"),
    supabase.from("audit_findings").select("id", { count: "exact", head: true }).neq("status", "closed"),
    supabase.from("corrective_actions").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
  ]);
  return {
    total: total.count ?? 0,
    inProgress: inProgress.count ?? 0,
    openFindings: openFindings.count ?? 0,
    openActions: openActions.count ?? 0,
  };
}

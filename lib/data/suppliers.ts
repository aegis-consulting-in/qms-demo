import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PaginationInput } from "@/lib/validation/common";

export const SUPPLIER_SELECT = `*, department:departments(id, name)` as const;

export type SupplierListFilters = PaginationInput & { status?: string; category?: string };

export async function listSuppliers(filters: SupplierListFilters) {
  const supabase = await createClient();
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let q = supabase.from("suppliers").select(SUPPLIER_SELECT, { count: "exact" }).is("deleted_at", null);
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_]/g, "")}%`;
    q = q.or(`name.ilike.${term},code.ilike.${term},contact_person.ilike.${term},service_supplied.ilike.${term}`);
  }
  if (filters.status) q = q.eq("status", filters.status as never);
  if (filters.category) q = q.eq("category", filters.category);

  const sortCol = ({ name: "name", code: "code", status: "status", review: "review_due_date", rating: "rating" } as Record<string, string>)[
    filters.sort ?? "name"
  ] ?? "name";
  q = q.order(sortCol, { ascending: filters.dir !== "desc", nullsFirst: false }).range(from, to);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: data, total: count ?? 0 };
}

export async function getSupplier(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select(SUPPLIER_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSupplierCategories() {
  const supabase = await createClient();
  const { data } = await supabase.from("suppliers").select("category").is("deleted_at", null).not("category", "is", null);
  return Array.from(new Set((data ?? []).map((r) => r.category).filter((c): c is string => Boolean(c)))).sort();
}

export async function getSupplierStats() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [total, active, reviewDue, pendingEval] = await Promise.all([
    supabase.from("suppliers").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("suppliers").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "active"),
    supabase.from("suppliers").select("id", { count: "exact", head: true }).is("deleted_at", null).lte("review_due_date", today),
    supabase.from("suppliers").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("evaluation_complete", false),
  ]);
  return {
    total: total.count ?? 0,
    active: active.count ?? 0,
    reviewDue: reviewDue.count ?? 0,
    pendingEvaluation: pendingEval.count ?? 0,
  };
}

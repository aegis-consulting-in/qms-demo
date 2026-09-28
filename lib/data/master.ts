import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Small lookup lists used by forms. Cached per request. */
export const getDepartments = cache(async (includeInactive = false) => {
  const supabase = await createClient();
  let q = supabase.from("departments").select("*").order("name");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data;
});

export const getJobTitles = cache(async (includeInactive = false) => {
  const supabase = await createClient();
  let q = supabase.from("job_titles").select("*").order("name");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data;
});

export const getTrainingLevels = cache(async (includeInactive = false) => {
  const supabase = await createClient();
  let q = supabase.from("training_levels").select("*").order("sort_order");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data;
});

export const getTrainingStatuses = cache(async (includeInactive = false) => {
  const supabase = await createClient();
  let q = supabase.from("training_statuses").select("*").order("sort_order");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data;
});

export const getRoles = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("roles").select("*").order("name");
  if (error) throw error;
  return data;
});

export const getPermissions = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("permissions").select("*").order("module").order("action");
  if (error) throw error;
  return data;
});

/** Lightweight employee list for pickers (RLS still applies). */
export const getEmployeeOptions = cache(async (onlyActive = true) => {
  const supabase = await createClient();
  let q = supabase
    .from("employees")
    .select("id, employee_code, first_name, last_name, email, is_manager, department_id, manager_id, user_id")
    .order("first_name")
    .order("last_name");
  if (onlyActive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data;
});

export const getPublicSettings = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("system_settings").select("key, value");
  const map: Record<string, unknown> = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return map;
});

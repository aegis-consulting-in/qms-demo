import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { DocumentModule } from "@/lib/types/database";
import type { PaginationInput } from "@/lib/validation/common";

export const DOCUMENT_SELECT = `*, uploader:profiles(id, full_name, email)` as const;

/** Files for a single entity (RLS restricts to entities the user may see). */
export async function getEntityDocuments(module: DocumentModule, entityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_SELECT)
    .eq("module", module)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getDocument(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("documents").select(DOCUMENT_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * File counts per module for the home folder strip. One query instead of a
 * full folder listing per shortcut.
 */
export async function getHomeFolderCounts() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("documents").select("module");
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.module] = (counts[row.module] ?? 0) + 1;
  return counts;
}

/**
 * Entities within a module that have at least one document the caller can
 * see, with counts. Used by the folder shortcut pages.
 */
export async function getModuleFolders(module: DocumentModule) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("entity_id, entity_type, file_size, created_at")
    .eq("module", module)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const folders = new Map<string, { entityId: string; entityType: string; count: number; bytes: number; latest: string }>();
  for (const d of data ?? []) {
    const f = folders.get(d.entity_id);
    if (f) {
      f.count += 1;
      f.bytes += d.file_size;
    } else {
      folders.set(d.entity_id, { entityId: d.entity_id, entityType: d.entity_type, count: 1, bytes: d.file_size, latest: d.created_at });
    }
  }
  return Array.from(folders.values());
}

/** Resolve display names for a set of entity ids in a module (RLS applies). */
export async function resolveEntityNames(module: DocumentModule, ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const supabase = await createClient();
  const names: Record<string, string> = {};

  switch (module) {
    case "training": {
      const { data } = await supabase.from("trainings").select("id, name, code").in("id", ids);
      for (const r of data ?? []) names[r.id] = r.code ? `${r.code} · ${r.name}` : r.name;
      break;
    }
    case "project": {
      const { data } = await supabase.from("projects").select("id, name, code").in("id", ids);
      for (const r of data ?? []) names[r.id] = `${r.code} · ${r.name}`;
      break;
    }
    case "supplier": {
      const { data } = await supabase.from("suppliers").select("id, name, code").in("id", ids);
      for (const r of data ?? []) names[r.id] = `${r.code} · ${r.name}`;
      break;
    }
    case "preventive-maintenance": {
      const { data } = await supabase.from("maintenance_records").select("id, title, asset:maintenance_assets(name)").in("id", ids);
      for (const r of data ?? []) names[r.id] = r.asset ? `${r.asset.name} · ${r.title}` : r.title;
      break;
    }
    case "audit": {
      const { data } = await supabase.from("audits").select("id, title, code").in("id", ids);
      for (const r of data ?? []) names[r.id] = `${r.code} · ${r.title}`;
      break;
    }
    case "employee": {
      const { data } = await supabase.from("employees").select("id, first_name, last_name, employee_code").in("id", ids);
      for (const r of data ?? []) names[r.id] = `${r.employee_code} · ${r.first_name} ${r.last_name}`;
      break;
    }
  }
  return names;
}

export async function listAllDocuments(filters: PaginationInput & { module?: string }) {
  const supabase = await createClient();
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let q = supabase.from("documents").select(DOCUMENT_SELECT, { count: "exact" });
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_]/g, "")}%`;
    q = q.or(`file_name.ilike.${term},description.ilike.${term}`);
  }
  if (filters.module) q = q.eq("module", filters.module as DocumentModule);
  q = q.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: data, total: count ?? 0 };
}

export async function getDocumentStats() {
  const supabase = await createClient();
  const { data } = await supabase.from("documents").select("module, file_size");
  const byModule: Record<string, { count: number; bytes: number }> = {};
  let total = 0;
  let bytes = 0;
  for (const d of data ?? []) {
    byModule[d.module] ??= { count: 0, bytes: 0 };
    byModule[d.module].count += 1;
    byModule[d.module].bytes += d.file_size;
    total += 1;
    bytes += d.file_size;
  }
  return { total, bytes, byModule };
}

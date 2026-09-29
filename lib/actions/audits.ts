"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/audit-log";
import { ForbiddenError, requireActionUser, requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { idSchema } from "@/lib/validation/common";
import {
  auditSchema,
  correctiveActionSchema,
  findingSchema,
  updateAuditSchema,
  updateCorrectiveActionSchema,
  updateFindingSchema,
  type AuditInput,
} from "@/lib/validation/audits";
import { runAction, type ActionResult } from "./result";

function toRow(input: AuditInput) {
  return {
    code: input.code,
    title: input.title,
    process_name: input.processName ?? null,
    department_id: input.departmentId ?? null,
    auditor_id: input.auditorId ?? null,
    audit_date: input.auditDate ?? null,
    audit_type: input.auditType,
    status: input.status,
    responsibility: input.responsibility ?? null,
    applicable_clauses: input.applicableClauses ?? null,
    inputs: input.inputs ?? null,
    activities: input.activities ?? null,
    outputs: input.outputs ?? null,
    interactions: input.interactions ?? null,
    summary: input.summary ?? null,
    notes: input.notes ?? null,
  };
}

/** Editors or the assigned auditor may modify an audit and its children. */
async function assertCanEditAudit(auditId: string) {
  const user = await requireActionUser();
  if (user.can(PERMISSIONS.audit.edit)) return user;
  const supabase = await createClient();
  const { data } = await supabase.from("audits").select("auditor_id").eq("id", auditId).maybeSingle();
  if (!data || !user.employee || data.auditor_id !== user.employee.id) throw new ForbiddenError();
  return user;
}

export async function createAuditAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(auditSchema, input, async (data) => {
    const user = await requirePermission(PERMISSIONS.audit.create);
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("audits")
      .insert({ ...toRow(data), created_by: user.id })
      .select("id")
      .single();
    if (error) throw error;
    await logAction(supabase, "audit.created", { type: "audit", id: row.id }, { code: data.code });
    revalidatePath("/audits");
    return { id: row.id };
  });
}

export async function updateAuditAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(updateAuditSchema, input, async ({ id, ...data }) => {
    await assertCanEditAudit(id);
    const supabase = await createClient();
    const { error } = await supabase.from("audits").update(toRow(data)).eq("id", id);
    if (error) throw error;
    await logAction(supabase, "audit.updated", { type: "audit", id }, { status: data.status });
    revalidatePath("/audits");
    revalidatePath(`/audits/${id}`);
    return { id };
  });
}

export async function deleteAuditAction(input: unknown): Promise<ActionResult> {
  return runAction(idSchema, input, async ({ id }) => {
    await requirePermission(PERMISSIONS.audit.delete);
    const supabase = await createClient();
    const { error } = await supabase.from("audits").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    await logAction(supabase, "audit.deleted", { type: "audit", id });
    revalidatePath("/audits");
    return undefined;
  });
}

// ------------------------------------------------------------------ findings
export async function createFindingAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(findingSchema, input, async (data) => {
    const user = await assertCanEditAudit(data.auditId);
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("audit_findings")
      .insert({
        audit_id: data.auditId,
        title: data.title,
        description: data.description ?? null,
        clause: data.clause ?? null,
        severity: data.severity,
        status: data.status,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) throw error;
    await logAction(supabase, "audit.finding_created", { type: "audit", id: data.auditId }, { finding_id: row.id });
    revalidatePath(`/audits/${data.auditId}`);
    return { id: row.id };
  });
}

export async function updateFindingAction(input: unknown): Promise<ActionResult> {
  return runAction(updateFindingSchema, input, async ({ id, ...data }) => {
    await assertCanEditAudit(data.auditId);
    const supabase = await createClient();
    const { error } = await supabase
      .from("audit_findings")
      .update({
        title: data.title,
        description: data.description ?? null,
        clause: data.clause ?? null,
        severity: data.severity,
        status: data.status,
      })
      .eq("id", id)
      .eq("audit_id", data.auditId);
    if (error) throw error;
    await logAction(supabase, "audit.finding_updated", { type: "audit", id: data.auditId }, { finding_id: id });
    revalidatePath(`/audits/${data.auditId}`);
    return undefined;
  });
}

export async function deleteFindingAction(input: unknown): Promise<ActionResult> {
  return runAction(idSchema.extend({ auditId: idSchema.shape.id }), input, async ({ id, auditId }) => {
    await assertCanEditAudit(auditId);
    const supabase = await createClient();
    const { error } = await supabase.from("audit_findings").delete().eq("id", id).eq("audit_id", auditId);
    if (error) throw error;
    await logAction(supabase, "audit.finding_deleted", { type: "audit", id: auditId }, { finding_id: id });
    revalidatePath(`/audits/${auditId}`);
    return undefined;
  });
}

// --------------------------------------------------------- corrective actions
export async function createCorrectiveActionAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(correctiveActionSchema, input, async (data) => {
    const user = await assertCanEditAudit(data.auditId);
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("corrective_actions")
      .insert({
        audit_id: data.auditId,
        finding_id: data.findingId ?? null,
        description: data.description,
        owner_id: data.ownerId ?? null,
        due_date: data.dueDate ?? null,
        completed_date: data.completedDate ?? null,
        status: data.status,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) throw error;
    await logAction(supabase, "audit.action_created", { type: "audit", id: data.auditId }, { action_id: row.id });
    revalidatePath(`/audits/${data.auditId}`);
    return { id: row.id };
  });
}

export async function updateCorrectiveActionAction(input: unknown): Promise<ActionResult> {
  return runAction(updateCorrectiveActionSchema, input, async ({ id, ...data }) => {
    const user = await requireActionUser();
    const supabase = await createClient();
    // Owners may update their own action even without audit edit rights.
    if (!user.can(PERMISSIONS.audit.edit)) {
      const { data: existing } = await supabase
        .from("corrective_actions")
        .select("owner_id, audit:audits(auditor_id)")
        .eq("id", id)
        .maybeSingle();
      const me = user.employee?.id;
      const allowed = existing && me && (existing.owner_id === me || existing.audit?.auditor_id === me);
      if (!allowed) throw new ForbiddenError();
    }
    const { error } = await supabase
      .from("corrective_actions")
      .update({
        finding_id: data.findingId ?? null,
        description: data.description,
        owner_id: data.ownerId ?? null,
        due_date: data.dueDate ?? null,
        completed_date: data.completedDate ?? null,
        status: data.status,
      })
      .eq("id", id)
      .eq("audit_id", data.auditId);
    if (error) throw error;
    await logAction(supabase, "audit.action_updated", { type: "audit", id: data.auditId }, { action_id: id, status: data.status });
    revalidatePath(`/audits/${data.auditId}`);
    return undefined;
  });
}

export async function deleteCorrectiveActionAction(input: unknown): Promise<ActionResult> {
  return runAction(idSchema.extend({ auditId: idSchema.shape.id }), input, async ({ id, auditId }) => {
    await assertCanEditAudit(auditId);
    const supabase = await createClient();
    const { error } = await supabase.from("corrective_actions").delete().eq("id", id).eq("audit_id", auditId);
    if (error) throw error;
    await logAction(supabase, "audit.action_deleted", { type: "audit", id: auditId }, { action_id: id });
    revalidatePath(`/audits/${auditId}`);
    return undefined;
  });
}

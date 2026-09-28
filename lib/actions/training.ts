"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/audit-log";
import { ForbiddenError, requireActionUser, requireAnyPermission, requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { idSchema } from "@/lib/validation/common";
import {
  assignTrainingSchema,
  trainingSchema,
  updateAssignmentStatusSchema,
  updateTrainingSchema,
  type TrainingInput,
} from "@/lib/validation/training";
import { runAction, type ActionResult } from "./result";

function toRow(input: TrainingInput) {
  return {
    code: input.code ?? null,
    name: input.name,
    description: input.description ?? null,
    level_id: input.levelId ?? null,
    status_id: input.statusId ?? null,
    duration_hours: input.durationHours ?? null,
  };
}

export async function createTrainingAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(trainingSchema, input, async (data) => {
    const user = await requirePermission(PERMISSIONS.training.create);
    const supabase = await createClient();

    let statusId = data.statusId ?? null;
    if (!statusId) {
      const { data: def } = await supabase.from("training_statuses").select("id").eq("is_default", true).maybeSingle();
      statusId = def?.id ?? null;
    }

    const { data: row, error } = await supabase
      .from("trainings")
      .insert({ ...toRow(data), status_id: statusId, created_by: user.id })
      .select("id")
      .single();
    if (error) throw error;
    await logAction(supabase, "training.created", { type: "training", id: row.id }, { name: data.name });
    revalidatePath("/training");
    return { id: row.id };
  });
}

export async function updateTrainingAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(updateTrainingSchema, input, async ({ id, ...data }) => {
    await requirePermission(PERMISSIONS.training.edit);
    const supabase = await createClient();
    const { error } = await supabase.from("trainings").update(toRow(data)).eq("id", id);
    if (error) throw error;
    await logAction(supabase, "training.updated", { type: "training", id });
    revalidatePath("/training");
    revalidatePath(`/training/${id}`);
    return { id };
  });
}

/** Soft delete (sets deleted_at). */
export async function archiveTrainingAction(input: unknown): Promise<ActionResult> {
  return runAction(idSchema, input, async ({ id }) => {
    await requirePermission(PERMISSIONS.training.delete);
    const supabase = await createClient();
    const { error } = await supabase.from("trainings").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    await logAction(supabase, "training.archived", { type: "training", id });
    revalidatePath("/training");
    return undefined;
  });
}

export async function restoreTrainingAction(input: unknown): Promise<ActionResult> {
  return runAction(idSchema, input, async ({ id }) => {
    await requirePermission(PERMISSIONS.training.delete);
    const supabase = await createClient();
    const { error } = await supabase.from("trainings").update({ deleted_at: null }).eq("id", id);
    if (error) throw error;
    await logAction(supabase, "training.restored", { type: "training", id });
    revalidatePath("/training");
    return undefined;
  });
}

/**
 * Assign a training to one or more employees. Duplicate active assignments
 * are skipped (the DB also enforces this with a partial unique index).
 * Managers holding only training.team may assign to their own reports; the
 * RLS insert policy verifies the reporting relationship.
 */
export async function assignTrainingAction(input: unknown): Promise<ActionResult<{ created: number; skipped: number }>> {
  return runAction(assignTrainingSchema, input, async (data) => {
    const user = await requireAnyPermission(PERMISSIONS.training.assign, PERMISSIONS.training.team);
    const supabase = await createClient();

    const { data: existing, error: existingError } = await supabase
      .from("training_assignments")
      .select("employee_id")
      .eq("training_id", data.trainingId)
      .in("employee_id", data.employeeIds)
      .in("status", ["assigned", "in_progress", "overdue"]);
    if (existingError) throw existingError;

    const already = new Set((existing ?? []).map((e) => e.employee_id));
    const targets = data.employeeIds.filter((e) => !already.has(e));
    if (!targets.length) return { created: 0, skipped: data.employeeIds.length };

    const { error } = await supabase.from("training_assignments").insert(
      targets.map((employeeId) => ({
        training_id: data.trainingId,
        employee_id: employeeId,
        assigned_by: user.id,
        assigned_date: data.assignedDate,
        due_date: data.dueDate ?? null,
        notes: data.notes ?? null,
      })),
    );
    if (error) throw error;

    await logAction(
      supabase,
      "training.assigned",
      { type: "training", id: data.trainingId },
      { employee_ids: targets, due_date: data.dueDate ?? null },
    );
    revalidatePath("/training");
    revalidatePath(`/training/${data.trainingId}`);
    return { created: targets.length, skipped: already.size };
  });
}

/**
 * Update an assignment's status. Employees can only progress their own
 * assignments (and cannot cancel them); managers/assigners can set anything.
 */
export async function updateAssignmentStatusAction(input: unknown): Promise<ActionResult> {
  return runAction(updateAssignmentStatusSchema, input, async ({ id, status, completionDate, notes }) => {
    const user = await requireActionUser();
    const supabase = await createClient();

    const { data: assignment, error: fetchError } = await supabase
      .from("training_assignments")
      .select("id, employee_id, training_id, status")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!assignment) throw new ForbiddenError("Assignment not found or not accessible.");

    const isOwn = user.employee?.id === assignment.employee_id;
    const isPrivileged = user.can(PERMISSIONS.training.assign) || user.can(PERMISSIONS.training.team);
    if (!isOwn && !isPrivileged) throw new ForbiddenError();
    if (isOwn && !isPrivileged && status === "cancelled") {
      throw new ForbiddenError("Only a manager can cancel an assignment.");
    }

    const { error } = await supabase
      .from("training_assignments")
      .update({
        status,
        completion_date: status === "completed" ? completionDate ?? new Date().toISOString().slice(0, 10) : null,
        ...(notes !== undefined ? { notes } : {}),
      })
      .eq("id", id);
    if (error) throw error;

    await logAction(supabase, "training.assignment_status", { type: "training_assignment", id }, {
      from: assignment.status,
      to: status,
    });
    revalidatePath("/training");
    revalidatePath(`/training/${assignment.training_id}`);
    return undefined;
  });
}

export async function deleteAssignmentAction(input: unknown): Promise<ActionResult> {
  return runAction(idSchema, input, async ({ id }) => {
    await requirePermission(PERMISSIONS.training.assign);
    const supabase = await createClient();
    const { error } = await supabase.from("training_assignments").delete().eq("id", id);
    if (error) throw error;
    await logAction(supabase, "training.assignment_deleted", { type: "training_assignment", id });
    revalidatePath("/training");
    return undefined;
  });
}

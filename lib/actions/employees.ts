"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/audit-log";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { idSchema } from "@/lib/validation/common";
import { employeeSchema, setEmployeeActiveSchema, updateEmployeeSchema, type EmployeeInput } from "@/lib/validation/employees";
import { runAction, type ActionResult } from "./result";

function toRow(input: EmployeeInput) {
  return {
    employee_code: input.employeeCode,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phone ?? null,
    department_id: input.departmentId ?? null,
    job_title_id: input.jobTitleId ?? null,
    manager_id: input.managerId ?? null,
    is_manager: input.isManager,
    joining_date: input.joiningDate ?? null,
    notes: input.notes ?? null,
  };
}

export async function createEmployeeAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(employeeSchema, input, async (data) => {
    const user = await requirePermission(PERMISSIONS.employee.create);
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("employees")
      .insert({ ...toRow(data), created_by: user.id })
      .select("id")
      .single();
    if (error) throw error;
    await logAction(supabase, "employee.created", { type: "employee", id: row.id }, { code: data.employeeCode });
    revalidatePath("/employees");
    return { id: row.id };
  });
}

export async function updateEmployeeAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(updateEmployeeSchema, input, async ({ id, ...data }) => {
    await requirePermission(PERMISSIONS.employee.edit);
    if (data.managerId === id) throw new Error("An employee cannot be their own manager.");
    const supabase = await createClient();
    const { error } = await supabase.from("employees").update(toRow(data)).eq("id", id);
    if (error) throw error;
    await logAction(supabase, "employee.updated", { type: "employee", id });
    revalidatePath("/employees");
    revalidatePath(`/employees/${id}`);
    return { id };
  });
}

export async function setEmployeeActiveAction(input: unknown): Promise<ActionResult> {
  return runAction(setEmployeeActiveSchema, input, async ({ id, isActive }) => {
    await requirePermission(PERMISSIONS.employee.edit);
    const supabase = await createClient();
    const { error } = await supabase.from("employees").update({ is_active: isActive }).eq("id", id);
    if (error) throw error;
    await logAction(supabase, isActive ? "employee.activated" : "employee.deactivated", { type: "employee", id });
    revalidatePath("/employees");
    revalidatePath(`/employees/${id}`);
    return undefined;
  });
}

export async function deleteEmployeeAction(input: unknown): Promise<ActionResult> {
  return runAction(idSchema, input, async ({ id }) => {
    await requirePermission(PERMISSIONS.employee.delete);
    const supabase = await createClient();
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) throw error;
    await logAction(supabase, "employee.deleted", { type: "employee", id });
    revalidatePath("/employees");
    return undefined;
  });
}

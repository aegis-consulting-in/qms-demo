"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/audit-log";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { idSchema } from "@/lib/validation/common";
import { supplierSchema, updateSupplierSchema, type SupplierInput } from "@/lib/validation/suppliers";
import { runAction, type ActionResult } from "./result";

function toRow(input: SupplierInput) {
  return {
    code: input.code,
    name: input.name,
    contact_person: input.contactPerson ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    address: input.address ?? null,
    category: input.category ?? null,
    department_id: input.departmentId ?? null,
    service_supplied: input.serviceSupplied ?? null,
    status: input.status,
    evaluation_complete: input.evaluationComplete,
    review_due_date: input.reviewDueDate ?? null,
    rating: input.rating ?? null,
    notes: input.notes ?? null,
  };
}

export async function createSupplierAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(supplierSchema, input, async (data) => {
    const user = await requirePermission(PERMISSIONS.supplier.create);
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("suppliers")
      .insert({ ...toRow(data), created_by: user.id })
      .select("id")
      .single();
    if (error) throw error;
    await logAction(supabase, "supplier.created", { type: "supplier", id: row.id }, { code: data.code });
    revalidatePath("/suppliers");
    return { id: row.id };
  });
}

export async function updateSupplierAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(updateSupplierSchema, input, async ({ id, ...data }) => {
    await requirePermission(PERMISSIONS.supplier.edit);
    const supabase = await createClient();
    const { error } = await supabase.from("suppliers").update(toRow(data)).eq("id", id);
    if (error) throw error;
    await logAction(supabase, "supplier.updated", { type: "supplier", id });
    revalidatePath("/suppliers");
    revalidatePath(`/suppliers/${id}`);
    return { id };
  });
}

export async function deleteSupplierAction(input: unknown): Promise<ActionResult> {
  return runAction(idSchema, input, async ({ id }) => {
    await requirePermission(PERMISSIONS.supplier.delete);
    const supabase = await createClient();
    const { error } = await supabase.from("suppliers").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    await logAction(supabase, "supplier.deleted", { type: "supplier", id });
    revalidatePath("/suppliers");
    return undefined;
  });
}

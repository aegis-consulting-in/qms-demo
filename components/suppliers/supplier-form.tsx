"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { AttachFilesField } from "@/components/documents/attach-files-field";
import { FileUpload } from "@/components/documents/file-upload";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { createSupplierAction, updateSupplierAction } from "@/lib/actions/suppliers";
import { uploadFilesToEntity } from "@/lib/documents/upload-client";
import { useAction } from "@/lib/hooks/use-action";
import { humanize } from "@/lib/format";
import type { SupplierRow } from "@/lib/types/database";
import { SUPPLIER_STATUSES, supplierSchema } from "@/lib/validation/suppliers";

type Values = z.input<typeof supplierSchema>;

export function SupplierForm({
  supplier,
  departments,
  categories,
}: {
  supplier?: SupplierRow;
  departments: { id: string; name: string }[];
  categories: string[];
}) {
  const router = useRouter();
  const isEdit = Boolean(supplier);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const form = useForm<Values>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      code: supplier?.code ?? "",
      name: supplier?.name ?? "",
      contactPerson: supplier?.contact_person ?? "",
      email: supplier?.email ?? "",
      phone: supplier?.phone ?? "",
      address: supplier?.address ?? "",
      category: supplier?.category ?? "",
      departmentId: supplier?.department_id ?? "",
      serviceSupplied: supplier?.service_supplied ?? "",
      status: supplier?.status ?? "active",
      evaluationComplete: supplier?.evaluation_complete ?? false,
      reviewDueDate: supplier?.review_due_date ?? "",
      rating: supplier?.rating ?? "",
      notes: supplier?.notes ?? "",
    },
  });
  const { run, isPending, error, fieldErrors } = useAction(
    async (values: Values) => {
      const result = isEdit ? await updateSupplierAction({ id: supplier!.id, ...values }) : await createSupplierAction(values);
      if (result.ok && pendingFiles.length) {
        const uploaded = await uploadFilesToEntity("supplier", result.data.id, pendingFiles);
        if (uploaded.ok) toast.success(uploaded.ok === 1 ? "File attached." : `${uploaded.ok} files attached.`);
      }
      return result;
    },
    { successMessage: isEdit ? "Supplier updated." : "Supplier created.", onSuccess: (d) => router.push(`/suppliers/${d.id}`) },
  );
  const err = (k: keyof Values) => form.formState.errors[k]?.message ?? fieldErrors[k];

  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} className="flex flex-col gap-5" noValidate>
      <FormError message={error} />
      <FormGrid>
        <FormField label="Supplier code" htmlFor="code" required error={err("code")}>
          <Input id="code" placeholder="SUP-001" {...form.register("code")} />
        </FormField>
        <FormField label="Supplier name" htmlFor="name" required error={err("name")}>
          <Input id="name" {...form.register("name")} />
        </FormField>
        <FormField label="Contact person" htmlFor="contactPerson" error={err("contactPerson")}>
          <Input id="contactPerson" {...form.register("contactPerson")} />
        </FormField>
        <FormField label="Email" htmlFor="email" error={err("email")}>
          <Input id="email" type="email" {...form.register("email")} />
        </FormField>
        <FormField label="Phone" htmlFor="phone" error={err("phone")}>
          <Input id="phone" {...form.register("phone")} />
        </FormField>
        <FormField label="Category" htmlFor="category" error={err("category")} hint="e.g. Raw materials, Calibration, IT services">
          <Input id="category" list="supplier-categories" {...form.register("category")} />
          <datalist id="supplier-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </FormField>
        <FormField label="Department served" htmlFor="departmentId" error={err("departmentId")}>
          <NativeSelect id="departmentId" {...form.register("departmentId")}>
            <option value="">— None —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Status" htmlFor="status" error={err("status")}>
          <NativeSelect id="status" {...form.register("status")}>
            {SUPPLIER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Review due date" htmlFor="reviewDueDate" error={err("reviewDueDate")}>
          <Input id="reviewDueDate" type="date" {...form.register("reviewDueDate")} />
        </FormField>
        <FormField label="Rating (0–5)" htmlFor="rating" error={err("rating")}>
          <Input id="rating" type="number" min="0" max="5" step="0.5" {...form.register("rating")} />
        </FormField>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.watch("evaluationComplete") as boolean} onCheckedChange={(c) => form.setValue("evaluationComplete", Boolean(c), { shouldDirty: true })} />
            Evaluation complete
          </label>
        </div>
      </FormGrid>
      <FormField label="Service / product supplied" htmlFor="serviceSupplied" error={err("serviceSupplied")}>
        <Textarea id="serviceSupplied" rows={2} {...form.register("serviceSupplied")} />
      </FormField>
      <FormField label="Address" htmlFor="address" error={err("address")}>
        <Textarea id="address" rows={2} {...form.register("address")} />
      </FormField>
      <FormField label="Notes" htmlFor="notes" error={err("notes")}>
        <Textarea id="notes" rows={3} {...form.register("notes")} />
      </FormField>
      {isEdit && supplier ? (
        <FileUpload module="supplier" entityId={supplier.id} compact />
      ) : (
        <AttachFilesField files={pendingFiles} onChange={setPendingFiles} disabled={isPending} />
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2Icon className="animate-spin" /> : null}
          {isEdit ? "Save changes" : "Create supplier"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

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
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { createMaintenanceRecordAction, updateMaintenanceRecordAction } from "@/lib/actions/maintenance";
import { uploadFilesToEntity } from "@/lib/documents/upload-client";
import { useAction } from "@/lib/hooks/use-action";
import { humanize } from "@/lib/format";
import type { MaintenanceRecordRow } from "@/lib/types/database";
import { MAINTENANCE_FREQUENCIES, MAINTENANCE_STATUSES, MAINTENANCE_TYPES, maintenanceRecordSchema } from "@/lib/validation/maintenance";

type Values = z.input<typeof maintenanceRecordSchema>;

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export function MaintenanceRecordForm({
  record,
  assets,
  employees,
  fixedAssetId,
  /** Technicians updating their own job get a reduced form. */
  limited = false,
}: {
  record?: MaintenanceRecordRow;
  assets: { id: string; asset_code: string; name: string }[];
  employees: { id: string; first_name: string; last_name: string; employee_code: string }[];
  fixedAssetId?: string;
  limited?: boolean;
}) {
  const router = useRouter();
  const isEdit = Boolean(record);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const form = useForm<Values>({
    resolver: zodResolver(maintenanceRecordSchema),
    defaultValues: {
      assetId: record?.asset_id ?? fixedAssetId ?? assets[0]?.id ?? "",
      title: record?.title ?? "",
      description: record?.description ?? "",
      maintenanceType: record?.maintenance_type ?? "preventive",
      frequency: record?.frequency ?? "",
      scheduledDate: record?.scheduled_date ?? "",
      dueDate: record?.due_date ?? "",
      completedDate: record?.completed_date ?? "",
      status: record?.status ?? "scheduled",
      assignedTo: record?.assigned_to ?? "",
      notes: record?.notes ?? "",
    },
  });
  const { run, isPending, error, fieldErrors } = useAction(
    async (values: Values) => {
      const result = isEdit
        ? await updateMaintenanceRecordAction({ id: record!.id, ...values })
        : await createMaintenanceRecordAction(values);
      if (result.ok && pendingFiles.length) {
        const uploaded = await uploadFilesToEntity("preventive-maintenance", result.data.id, pendingFiles);
        if (uploaded.ok) toast.success(uploaded.ok === 1 ? "File attached." : `${uploaded.ok} files attached.`);
      }
      return result;
    },
    { successMessage: isEdit ? "Record updated." : "Maintenance record created.", onSuccess: (d) => router.push(`/maintenance/${d.id}`) },
  );
  const err = (k: keyof Values) => form.formState.errors[k]?.message ?? fieldErrors[k];

  return (
    <form
      // Disabled controls are omitted from RHF values; fill them back in from the defaults.
      onSubmit={form.handleSubmit((v) => run({ ...(form.formState.defaultValues as Values), ...stripUndefined(v) }))}
      className="flex flex-col gap-5"
      noValidate
    >
      <FormError message={error} />
      <FormGrid>
        <FormField label="Asset" htmlFor="assetId" required error={err("assetId")} className="md:col-span-2">
          <NativeSelect id="assetId" disabled={limited || Boolean(fixedAssetId)} {...form.register("assetId")}>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.asset_code} · {a.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Title" htmlFor="title" required error={err("title")} className="md:col-span-2">
          <Input id="title" placeholder="e.g. Quarterly calibration" disabled={limited} {...form.register("title")} />
        </FormField>
        <FormField label="Type" htmlFor="maintenanceType" error={err("maintenanceType")}>
          <NativeSelect id="maintenanceType" disabled={limited} {...form.register("maintenanceType")}>
            {MAINTENANCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {humanize(t)}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Frequency" htmlFor="frequency" error={err("frequency")}>
          <NativeSelect id="frequency" disabled={limited} {...form.register("frequency")}>
            <option value="">— None —</option>
            {MAINTENANCE_FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {humanize(f)}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Scheduled date" htmlFor="scheduledDate" error={err("scheduledDate")}>
          <Input id="scheduledDate" type="date" disabled={limited} {...form.register("scheduledDate")} />
        </FormField>
        <FormField label="Due date" htmlFor="dueDate" error={err("dueDate")}>
          <Input id="dueDate" type="date" disabled={limited} {...form.register("dueDate")} />
        </FormField>
        <FormField label="Status" htmlFor="status" error={err("status")}>
          <NativeSelect id="status" {...form.register("status")}>
            {MAINTENANCE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Completed date" htmlFor="completedDate" error={err("completedDate")}>
          <Input id="completedDate" type="date" {...form.register("completedDate")} />
        </FormField>
        <FormField label="Assigned technician" htmlFor="assignedTo" error={err("assignedTo")} className="md:col-span-2">
          <NativeSelect id="assignedTo" disabled={limited} {...form.register("assignedTo")}>
            <option value="">— Unassigned —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.first_name} {e.last_name} ({e.employee_code})
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </FormGrid>
      <FormField label="Description / procedure" htmlFor="description" error={err("description")}>
        <Textarea id="description" rows={3} disabled={limited} {...form.register("description")} />
      </FormField>
      <FormField label="Notes / findings" htmlFor="notes" error={err("notes")}>
        <Textarea id="notes" rows={3} {...form.register("notes")} />
      </FormField>
      {isEdit && record ? (
        <FileUpload module="preventive-maintenance" entityId={record.id} compact />
      ) : (
        <AttachFilesField files={pendingFiles} onChange={setPendingFiles} disabled={isPending} />
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2Icon className="animate-spin" /> : null}
          {isEdit ? "Save changes" : "Create record"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

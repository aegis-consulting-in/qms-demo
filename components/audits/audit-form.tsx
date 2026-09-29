"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { createAuditAction, updateAuditAction } from "@/lib/actions/audits";
import { useAction } from "@/lib/hooks/use-action";
import { humanize } from "@/lib/format";
import type { AuditRow } from "@/lib/types/database";
import { AUDIT_STATUSES, AUDIT_TYPES, auditSchema } from "@/lib/validation/audits";

type Values = z.input<typeof auditSchema>;

export function AuditForm({
  audit,
  departments,
  employees,
}: {
  audit?: AuditRow;
  departments: { id: string; name: string }[];
  employees: { id: string; first_name: string; last_name: string; employee_code: string }[];
}) {
  const router = useRouter();
  const isEdit = Boolean(audit);
  const form = useForm<Values>({
    resolver: zodResolver(auditSchema),
    defaultValues: {
      code: audit?.code ?? "",
      title: audit?.title ?? "",
      processName: audit?.process_name ?? "",
      departmentId: audit?.department_id ?? "",
      auditorId: audit?.auditor_id ?? "",
      auditDate: audit?.audit_date ?? "",
      auditType: audit?.audit_type ?? "internal",
      status: audit?.status ?? "planned",
      responsibility: audit?.responsibility ?? "",
      applicableClauses: audit?.applicable_clauses ?? "",
      inputs: audit?.inputs ?? "",
      activities: audit?.activities ?? "",
      outputs: audit?.outputs ?? "",
      interactions: audit?.interactions ?? "",
      summary: audit?.summary ?? "",
      notes: audit?.notes ?? "",
    },
  });
  const { run, isPending, error, fieldErrors } = useAction(
    async (values: Values) => (isEdit ? updateAuditAction({ id: audit!.id, ...values }) : createAuditAction(values)),
    { successMessage: isEdit ? "Audit updated." : "Audit created.", onSuccess: (d) => router.push(`/audits/${d.id}`) },
  );
  const err = (k: keyof Values) => form.formState.errors[k]?.message ?? fieldErrors[k];

  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} className="flex flex-col gap-5" noValidate>
      <FormError message={error} />
      <FormGrid>
        <FormField label="Audit code" htmlFor="code" required error={err("code")}>
          <Input id="code" placeholder="AUD-001" {...form.register("code")} />
        </FormField>
        <FormField label="Status" htmlFor="status" error={err("status")}>
          <NativeSelect id="status" {...form.register("status")}>
            {AUDIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Title" htmlFor="title" required error={err("title")} className="md:col-span-2">
          <Input id="title" {...form.register("title")} />
        </FormField>
        <FormField label="Process" htmlFor="processName" error={err("processName")}>
          <Input id="processName" {...form.register("processName")} />
        </FormField>
        <FormField label="Audit date" htmlFor="auditDate" error={err("auditDate")}>
          <Input id="auditDate" type="date" {...form.register("auditDate")} />
        </FormField>
        <FormField label="Audit type" htmlFor="auditType" error={err("auditType")}>
          <NativeSelect id="auditType" {...form.register("auditType")}>
            {AUDIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {humanize(t)}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Department" htmlFor="departmentId" error={err("departmentId")}>
          <NativeSelect id="departmentId" {...form.register("departmentId")}>
            <option value="">— None —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Auditor" htmlFor="auditorId" error={err("auditorId")}>
          <NativeSelect id="auditorId" {...form.register("auditorId")}>
            <option value="">— Unassigned —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.first_name} {e.last_name} ({e.employee_code})
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Responsibility" htmlFor="responsibility" error={err("responsibility")} className="md:col-span-2">
          <Input id="responsibility" {...form.register("responsibility")} />
        </FormField>
        <FormField label="Applicable clauses" htmlFor="applicableClauses" error={err("applicableClauses")} className="md:col-span-2">
          <Input id="applicableClauses" placeholder="e.g. ISO 9001 8.5.1" {...form.register("applicableClauses")} />
        </FormField>
      </FormGrid>
      <FormField label="Inputs" htmlFor="inputs" error={err("inputs")}>
        <Textarea id="inputs" rows={2} {...form.register("inputs")} />
      </FormField>
      <FormField label="Activities" htmlFor="activities" error={err("activities")}>
        <Textarea id="activities" rows={2} {...form.register("activities")} />
      </FormField>
      <FormField label="Outputs" htmlFor="outputs" error={err("outputs")}>
        <Textarea id="outputs" rows={2} {...form.register("outputs")} />
      </FormField>
      <FormField label="Interactions" htmlFor="interactions" error={err("interactions")}>
        <Textarea id="interactions" rows={2} {...form.register("interactions")} />
      </FormField>
      <FormField label="Summary" htmlFor="summary" error={err("summary")}>
        <Textarea id="summary" rows={3} {...form.register("summary")} />
      </FormField>
      <FormField label="Notes" htmlFor="notes" error={err("notes")}>
        <Textarea id="notes" rows={2} {...form.register("notes")} />
      </FormField>
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2Icon className="animate-spin" /> : null}
          {isEdit ? "Save changes" : "Create audit"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

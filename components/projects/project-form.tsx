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
import { createProjectAction, updateProjectAction } from "@/lib/actions/projects";
import { useAction } from "@/lib/hooks/use-action";
import { humanize } from "@/lib/format";
import type { ProjectRow } from "@/lib/types/database";
import { PROJECT_PRIORITIES, PROJECT_STATUSES, projectSchema } from "@/lib/validation/projects";

type Values = z.input<typeof projectSchema>;

export function ProjectForm({
  project,
  employees,
}: {
  project?: ProjectRow;
  employees: { id: string; first_name: string; last_name: string; employee_code: string }[];
}) {
  const router = useRouter();
  const isEdit = Boolean(project);
  const form = useForm<Values>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      code: project?.code ?? "",
      name: project?.name ?? "",
      description: project?.description ?? "",
      managerId: project?.manager_id ?? "",
      startDate: project?.start_date ?? "",
      expectedEndDate: project?.expected_end_date ?? "",
      actualEndDate: project?.actual_end_date ?? "",
      status: project?.status ?? "planning",
      priority: project?.priority ?? "medium",
      notes: project?.notes ?? "",
    },
  });
  const { run, isPending, error, fieldErrors } = useAction(
    async (values: Values) => (isEdit ? updateProjectAction({ id: project!.id, ...values }) : createProjectAction(values)),
    { successMessage: isEdit ? "Project updated." : "Project created.", onSuccess: (d) => router.push(`/projects/${d.id}`) },
  );
  const err = (k: keyof Values) => form.formState.errors[k]?.message ?? fieldErrors[k];

  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} className="flex flex-col gap-5" noValidate>
      <FormError message={error} />
      <FormGrid>
        <FormField label="Project code" htmlFor="code" required error={err("code")}>
          <Input id="code" placeholder="PRJ-001" {...form.register("code")} />
        </FormField>
        <FormField label="Project name" htmlFor="name" required error={err("name")}>
          <Input id="name" {...form.register("name")} />
        </FormField>
        <FormField label="Project manager" htmlFor="managerId" error={err("managerId")}>
          <NativeSelect id="managerId" {...form.register("managerId")}>
            <option value="">— Unassigned —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.first_name} {e.last_name} ({e.employee_code})
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Status" htmlFor="status" error={err("status")}>
            <NativeSelect id="status" {...form.register("status")}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Priority" htmlFor="priority" error={err("priority")}>
            <NativeSelect id="priority" {...form.register("priority")}>
              {PROJECT_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {humanize(p)}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        </div>
        <FormField label="Start date" htmlFor="startDate" error={err("startDate")}>
          <Input id="startDate" type="date" {...form.register("startDate")} />
        </FormField>
        <FormField label="Expected end date" htmlFor="expectedEndDate" error={err("expectedEndDate")}>
          <Input id="expectedEndDate" type="date" {...form.register("expectedEndDate")} />
        </FormField>
        <FormField label="Actual end date" htmlFor="actualEndDate" error={err("actualEndDate")}>
          <Input id="actualEndDate" type="date" {...form.register("actualEndDate")} />
        </FormField>
      </FormGrid>
      <FormField label="Description" htmlFor="description" error={err("description")}>
        <Textarea id="description" rows={4} {...form.register("description")} />
      </FormField>
      <FormField label="Notes" htmlFor="notes" error={err("notes")}>
        <Textarea id="notes" rows={3} {...form.register("notes")} />
      </FormField>
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2Icon className="animate-spin" /> : null}
          {isEdit ? "Save changes" : "Create project"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { createEmployeeAction, updateEmployeeAction } from "@/lib/actions/employees";
import { useAction } from "@/lib/hooks/use-action";
import type { EmployeeRow } from "@/lib/types/database";
import { employeeSchema } from "@/lib/validation/employees";

type Values = z.input<typeof employeeSchema>;
type Option = { id: string; name: string };

export function EmployeeForm({
  employee,
  departments,
  jobTitles,
  managers,
}: {
  employee?: EmployeeRow;
  departments: Option[];
  jobTitles: Option[];
  managers: { id: string; first_name: string; last_name: string; employee_code: string }[];
}) {
  const router = useRouter();
  const isEdit = Boolean(employee);

  const form = useForm<Values>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employeeCode: employee?.employee_code ?? "",
      firstName: employee?.first_name ?? "",
      lastName: employee?.last_name ?? "",
      email: employee?.email ?? "",
      phone: employee?.phone ?? "",
      departmentId: employee?.department_id ?? "",
      jobTitleId: employee?.job_title_id ?? "",
      managerId: employee?.manager_id ?? "",
      isManager: employee?.is_manager ?? false,
      joiningDate: employee?.joining_date ?? "",
      notes: employee?.notes ?? "",
    },
  });

  const { run, isPending, error, fieldErrors } = useAction(
    async (values: Values) => (isEdit ? updateEmployeeAction({ id: employee!.id, ...values }) : createEmployeeAction(values)),
    {
      successMessage: isEdit ? "Employee updated." : "Employee created.",
      onSuccess: (data) => router.push(`/employees/${data.id}`),
    },
  );

  const err = (k: keyof Values) => form.formState.errors[k]?.message ?? fieldErrors[k];

  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} className="flex flex-col gap-5" noValidate>
      <FormError message={error} />
      <FormGrid>
        <FormField label="Employee code" htmlFor="employeeCode" required error={err("employeeCode")}>
          <Input id="employeeCode" placeholder="EMP-0001" {...form.register("employeeCode")} />
        </FormField>
        <FormField label="Email" htmlFor="email" required error={err("email")}>
          <Input id="email" type="email" {...form.register("email")} />
        </FormField>
        <FormField label="First name" htmlFor="firstName" required error={err("firstName")}>
          <Input id="firstName" {...form.register("firstName")} />
        </FormField>
        <FormField label="Last name" htmlFor="lastName" required error={err("lastName")}>
          <Input id="lastName" {...form.register("lastName")} />
        </FormField>
        <FormField label="Phone" htmlFor="phone" error={err("phone")}>
          <Input id="phone" {...form.register("phone")} />
        </FormField>
        <FormField label="Joining date" htmlFor="joiningDate" error={err("joiningDate")}>
          <Input id="joiningDate" type="date" {...form.register("joiningDate")} />
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
        <FormField label="Job title" htmlFor="jobTitleId" error={err("jobTitleId")}>
          <NativeSelect id="jobTitleId" {...form.register("jobTitleId")}>
            <option value="">— None —</option>
            {jobTitles.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Reports to" htmlFor="managerId" error={err("managerId")} hint="Managers see their reports' trainings.">
          <NativeSelect id="managerId" {...form.register("managerId")}>
            <option value="">— None —</option>
            {managers
              .filter((m) => m.id !== employee?.id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name} ({m.employee_code})
                </option>
              ))}
          </NativeSelect>
        </FormField>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.watch("isManager") as boolean}
              onCheckedChange={(c) => form.setValue("isManager", Boolean(c), { shouldDirty: true })}
            />
            Is a people manager
          </label>
        </div>
      </FormGrid>
      <FormField label="Notes" htmlFor="notes" error={err("notes")}>
        <Textarea id="notes" rows={3} {...form.register("notes")} />
      </FormField>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2Icon className="animate-spin" /> : null}
          {isEdit ? "Save changes" : "Create employee"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

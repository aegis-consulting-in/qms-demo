"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { createUserAction } from "@/lib/actions/admin";
import { useAction } from "@/lib/hooks/use-action";
import { createUserSchema } from "@/lib/validation/admin";

type Values = z.input<typeof createUserSchema>;

export function CreateUserForm({
  roles,
  employees,
}: {
  roles: { id: string; name: string; description: string | null }[];
  employees: { id: string; employee_code: string; first_name: string; last_name: string }[];
}) {
  const router = useRouter();
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const form = useForm<Values>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: "", fullName: "", password: "", roleIds: [], employeeId: "", mustChangePassword: true },
  });
  const { run, isPending, error, fieldErrors } = useAction(createUserAction, {
    successMessage: "User created.",
    onSuccess: (d) => router.push(`/admin/users/${d.id}`),
  });
  const err = (k: keyof Values) => form.formState.errors[k]?.message ?? fieldErrors[k];

  const toggleRole = (id: string) => {
    const next = roleIds.includes(id) ? roleIds.filter((x) => x !== id) : [...roleIds, id];
    setRoleIds(next);
    form.setValue("roleIds", next, { shouldValidate: true });
  };

  return (
    <form onSubmit={form.handleSubmit((v) => run({ ...v, roleIds }))} className="flex flex-col gap-5" noValidate>
      <FormError message={error} />
      <FormGrid>
        <FormField label="Full name" htmlFor="fullName" required error={err("fullName")}>
          <Input id="fullName" {...form.register("fullName")} />
        </FormField>
        <FormField label="Email" htmlFor="email" required error={err("email")}>
          <Input id="email" type="email" autoComplete="off" {...form.register("email")} />
        </FormField>
        <FormField label="Temporary password" htmlFor="password" required error={err("password")} hint="At least 8 characters, with a letter and a number.">
          <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
        </FormField>
        <FormField label="Link employee record" htmlFor="employeeId" error={err("employeeId")}>
          <NativeSelect id="employeeId" {...form.register("employeeId")}>
            <option value="">— None —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.employee_code} · {e.first_name} {e.last_name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </FormGrid>
      <FormField label="Roles" required error={err("roleIds")}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {roles.map((r) => (
            <li key={r.id}>
              <label className="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
                <Checkbox checked={roleIds.includes(r.id)} onCheckedChange={() => toggleRole(r.id)} />
                <span>
                  <span className="font-medium">{r.name}</span>
                  {r.description ? <span className="block text-xs text-muted-foreground">{r.description}</span> : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </FormField>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.watch("mustChangePassword") as boolean}
          onCheckedChange={(c) => form.setValue("mustChangePassword", Boolean(c))}
        />
        Require password change on first login
      </label>
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2Icon className="animate-spin" /> : null} Create user
        </Button>
      </div>
    </form>
  );
}

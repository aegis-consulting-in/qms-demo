"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { updateProfileAction } from "@/lib/actions/auth";
import { useAction } from "@/lib/hooks/use-action";
import { updateProfileSchema } from "@/lib/validation/auth";

type Values = z.input<typeof updateProfileSchema>;

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const form = useForm<Values>({ resolver: zodResolver(updateProfileSchema), defaultValues: { fullName } });
  const { run, isPending, fieldErrors } = useAction(updateProfileAction, { successMessage: "Profile updated." });

  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} className="flex flex-col gap-4" noValidate>
      <FormField label="Email" htmlFor="email" hint="Email is managed by your administrator.">
        <Input id="email" value={email} disabled readOnly />
      </FormField>
      <FormField label="Full name" htmlFor="fullName" required error={form.formState.errors.fullName?.message ?? fieldErrors.fullName}>
        <Input id="fullName" {...form.register("fullName")} />
      </FormField>
      <div>
        <Button type="submit" disabled={isPending || !form.formState.isDirty}>
          {isPending ? <Loader2Icon className="animate-spin" /> : null}
          Save changes
        </Button>
      </div>
    </form>
  );
}

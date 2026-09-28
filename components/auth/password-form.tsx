"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError, FormField } from "@/components/ui/form-field";
import type { ActionResult } from "@/lib/actions/result";
import { useAction } from "@/lib/hooks/use-action";
import { changePasswordSchema, resetPasswordSchema } from "@/lib/validation/auth";

type Props = {
  title: string;
  description?: string;
  mode: "reset" | "change";
  action: (input: unknown) => Promise<ActionResult>;
  redirectTo?: string;
};

type ChangeValues = z.input<typeof changePasswordSchema>;

export function PasswordForm({ title, description, mode, action, redirectTo }: Props) {
  const router = useRouter();
  const schema = mode === "change" ? changePasswordSchema : resetPasswordSchema;
  const form = useForm<ChangeValues>({
    resolver: zodResolver(schema as typeof changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { run, isPending, error, fieldErrors } = useAction(action, {
    successMessage: "Password updated.",
    onSuccess: () => {
      form.reset();
      if (redirectTo) router.push(redirectTo as never);
    },
  });

  return (
    <form onSubmit={form.handleSubmit((values) => run(values))} className="flex flex-col gap-4" noValidate>
      <div>
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <FormError message={error} />

      {mode === "change" ? (
        <FormField
          label="Current password"
          htmlFor="currentPassword"
          required
          error={form.formState.errors.currentPassword?.message ?? fieldErrors.currentPassword}
        >
          <Input id="currentPassword" type="password" autoComplete="current-password" {...form.register("currentPassword")} />
        </FormField>
      ) : null}

      <FormField
        label="New password"
        htmlFor="newPassword"
        required
        hint="At least 8 characters with a letter and a number."
        error={form.formState.errors.newPassword?.message ?? fieldErrors.newPassword}
      >
        <Input id="newPassword" type="password" autoComplete="new-password" {...form.register("newPassword")} />
      </FormField>
      <FormField
        label="Confirm new password"
        htmlFor="confirmPassword"
        required
        error={form.formState.errors.confirmPassword?.message ?? fieldErrors.confirmPassword}
      >
        <Input id="confirmPassword" type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
      </FormField>

      <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? <Loader2Icon className="animate-spin" /> : null}
        Update password
      </Button>
    </form>
  );
}

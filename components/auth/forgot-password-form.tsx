"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2Icon, MailCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError, FormField } from "@/components/ui/form-field";
import { forgotPasswordAction } from "@/lib/actions/auth";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <MailCheckIcon className="size-8 text-success" />
        <h2 className="font-heading text-lg font-semibold">Check your inbox</h2>
        <p className="text-sm text-muted-foreground">
          If an account exists for that email, we&apos;ve sent a link to reset your password.
        </p>
        <Button variant="outline" render={<Link href="/login" />}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <div>
        <h2 className="font-heading text-lg font-semibold">Reset your password</h2>
        <p className="text-sm text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>
      </div>
      <FormError message={state && !state.ok ? state.error : null} />
      <FormField label="Email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="text"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
      </FormField>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        Send reset link
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

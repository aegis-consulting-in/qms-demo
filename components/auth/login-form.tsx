"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError, FormField } from "@/components/ui/form-field";
import { loginAction } from "@/lib/actions/auth";

export function LoginForm({ next, message }: { next?: string; message?: string }) {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight">Sign in</h2>
        <p className="mt-1 text-sm text-muted-foreground">Use the email address issued by your administrator.</p>
      </div>

      {message ? <div className="rounded-md border bg-muted px-3 py-2 text-sm">{message}</div> : null}
      <FormError message={state && !state.ok ? state.error : null} />

      {next ? <input type="hidden" name="next" value={next} /> : null}

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
          placeholder="name@company.com"
        />
      </FormField>
      <FormField label="Password" htmlFor="password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </FormField>

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? <Loader2Icon className="animate-spin" /> : null}
        Sign in
      </Button>

      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-sm font-medium text-brand hover:underline">
          Forgot password
        </Link>
      </p>
    </form>
  );
}

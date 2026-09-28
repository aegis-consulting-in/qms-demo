import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PasswordForm } from "@/components/auth/password-form";
import { resetPasswordAction } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Set a new password" };

/**
 * Landing page of the email reset link (after /auth/callback exchanged the
 * code for a session). Requires a live session created by that exchange.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="font-heading text-lg font-semibold">Link expired</h2>
        <p className="text-sm text-muted-foreground">This password reset link is invalid or has expired.</p>
        <Button render={<Link href="/forgot-password" />}>Request a new link</Button>
      </div>
    );
  }

  return (
    <PasswordForm
      title="Set a new password"
      description={`Signed in as ${user.email}. Choose a new password to continue.`}
      mode="reset"
      action={resetPasswordAction}
      redirectTo="/"
    />
  );
}

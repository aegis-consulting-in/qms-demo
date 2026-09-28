"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/audit-log";
import { publicEnv } from "@/lib/env";
import { requireActionUser } from "@/lib/auth/guards";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "@/lib/validation/auth";
import { fail, ok, runAction, type ActionResult } from "./result";

function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function loginAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Enter your email and password.";
    return fail(first);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) return fail("Invalid email or password.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, must_change_password")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile && !profile.is_active) {
    await supabase.auth.signOut();
    return fail("This account has been deactivated. Contact your administrator.");
  }

  void supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);
  void logAction(supabase, "auth.login", { type: "user", id: data.user.id });

  redirect(profile?.must_change_password ? "/profile/change-password?forced=1" : safeNext(parsed.data.next));
}

export async function logoutAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await logAction(supabase, "auth.logout", { type: "user", id: user.id });
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Enter a valid email address.");

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/reset-password`,
  });
  // Always succeed to avoid leaking which emails exist.
  return ok(undefined);
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  return runAction(resetPasswordSchema, input, async ({ newPassword }) => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Your reset link has expired. Request a new one.");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);
    await logAction(supabase, "auth.password_reset", { type: "user", id: user.id });
    return undefined;
  });
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  return runAction(changePasswordSchema, input, async ({ currentPassword, newPassword }) => {
    const user = await requireActionUser();
    const supabase = await createClient();

    // Re-authenticate before changing the password.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) throw new Error("Current password is incorrect.");

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);

    await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);
    await logAction(supabase, "auth.password_changed", { type: "user", id: user.id });
    return undefined;
  });
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  return runAction(updateProfileSchema, input, async ({ fullName }) => {
    const user = await requireActionUser();
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
    if (error) throw error;
    await supabase.auth.updateUser({ data: { full_name: fullName } });
    await logAction(supabase, "profile.updated", { type: "user", id: user.id });
    return undefined;
  });
}

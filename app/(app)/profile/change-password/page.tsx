import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/shared/page-header";
import { PasswordForm } from "@/components/auth/password-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { changePasswordAction } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Change Password" };

export default async function ChangePasswordPage({ searchParams }: PageProps<"/profile/change-password">) {
  const user = await requireUser();
  const params = await searchParams;
  const forced = params.forced === "1" || user.profile.must_change_password;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Change Password" crumbs={[{ label: "My Profile", href: "/profile" }, { label: "Change Password" }]} />
      {forced ? (
        <Alert>
          <AlertTitle>Please set a new password</AlertTitle>
          <AlertDescription>Your password was set by an administrator. Choose your own password before continuing.</AlertDescription>
        </Alert>
      ) : null}
      <Section className="max-w-lg">
        <PasswordForm title="Update your password" mode="change" action={changePasswordAction} redirectTo={forced ? "/" : undefined} />
      </Section>
    </div>
  );
}

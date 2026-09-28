import type { Metadata } from "next";
import Link from "next/link";
import { KeyRoundIcon } from "lucide-react";
import { PageHeader, Section } from "@/components/shared/page-header";
import { DetailList } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/auth/profile-form";
import { requireUser } from "@/lib/auth/guards";
import { formatDate, formatDateTime } from "@/lib/format";
import { getEmployee } from "@/lib/data/employees";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const employee = user.employee ? await getEmployee(user.employee.id) : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="My Profile"
        description="Your account details, roles and permissions."
        crumbs={[{ label: "My Profile" }]}
        actions={
          <Button variant="outline" render={<Link href="/profile/change-password" />}>
            <KeyRoundIcon /> Change password
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Account">
          <ProfileForm fullName={user.profile.full_name ?? ""} email={user.email} />
          <div className="mt-4 border-t pt-4">
            <DetailList
              items={[
                { label: "Last sign in", value: formatDateTime(user.profile.last_login_at) },
                { label: "Account status", value: <StatusBadge status={user.profile.is_active ? "active" : "inactive"} /> },
              ]}
            />
          </div>
        </Section>

        <Section title="Employee record">
          {employee ? (
            <DetailList
              items={[
                { label: "Employee code", value: employee.employee_code },
                { label: "Name", value: `${employee.first_name} ${employee.last_name}` },
                { label: "Department", value: employee.department?.name ?? "—" },
                { label: "Job title", value: employee.job_title?.name ?? "—" },
                { label: "Manager", value: employee.manager ? `${employee.manager.first_name} ${employee.manager.last_name}` : "—" },
                { label: "Joined", value: formatDate(employee.joining_date) },
              ]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Your account is not linked to an employee record yet. Ask an administrator to link it.</p>
          )}
        </Section>

        <Section title="Roles" className="lg:col-span-2" description="Permissions are granted through roles. Contact an administrator to change them.">
          <div className="flex flex-wrap gap-2">
            {user.roles.length ? user.roles.map((r) => <StatusBadge key={r.id} status={r.name} tone="info" />) : <span className="text-sm text-muted-foreground">No roles assigned.</span>}
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-brand">View effective permissions ({user.permissions.size})</summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Array.from(user.permissions)
                .sort()
                .map((p) => (
                  <code key={p} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {p}
                  </code>
                ))}
            </div>
          </details>
        </Section>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminResetPasswordForm, UserRolesForm, UserStatusButton } from "@/components/admin/user-actions";
import { DetailList } from "@/components/shared/data-table";
import { PageHeader, Section } from "@/components/shared/page-header";
import { BooleanBadge } from "@/components/shared/status-badge";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getUserWithRoles } from "@/lib/data/admin";
import { one } from "@/lib/data/helpers";
import { getRoles } from "@/lib/data/master";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "User" };

export default async function AdminUserDetailPage({ params }: PageProps<"/admin/users/[id]">) {
  const actor = await requirePagePermission(PERMISSIONS.admin.users);
  const { id } = await params;
  const [profile, roles] = await Promise.all([getUserWithRoles(id), getRoles()]);
  if (!profile) notFound();
  const employee = one(profile.employee);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={profile.full_name ?? profile.email}
        description={profile.email}
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Users", href: "/admin/users" }, { label: profile.full_name ?? profile.email }]}
        actions={<UserStatusButton userId={profile.id} isActive={profile.is_active} />}
      />
      <AdminNav can={(k) => actor.can(k)} current="users" />

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title="Account" className="lg:col-span-2">
          <DetailList
            items={[
              { label: "Email", value: profile.email },
              { label: "Active", value: <BooleanBadge value={profile.is_active} /> },
              { label: "Must change password", value: <BooleanBadge value={profile.must_change_password} /> },
              { label: "Last login", value: formatDateTime(profile.last_login_at) },
              { label: "Created", value: formatDateTime(profile.created_at) },
              {
                label: "Linked employee",
                value: employee ? (
                  <Link href={`/employees/${employee.id}`} className="hover:underline">
                    {employee.employee_code} · {employee.first_name} {employee.last_name}
                  </Link>
                ) : (
                  "—"
                ),
              },
            ]}
          />
        </Section>
        <Section title="Reset password">
          <AdminResetPasswordForm userId={profile.id} />
        </Section>
      </div>

      <Section title="Roles" description="Permissions are granted through roles, not assigned to the user directly.">
        <UserRolesForm userId={profile.id} roles={roles} currentRoleIds={profile.roles.map((r) => r.id)} />
      </Section>
    </div>
  );
}

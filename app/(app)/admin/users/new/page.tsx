import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { CreateUserForm } from "@/components/admin/user-form";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getEmployeeOptions, getRoles } from "@/lib/data/master";

export const metadata: Metadata = { title: "New user" };

export default async function NewUserPage() {
  const user = await requirePagePermission(PERMISSIONS.admin.users);
  const [roles, employees] = await Promise.all([getRoles(), getEmployeeOptions(false)]);
  const unlinked = employees.filter((e) => !e.user_id);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="New user" crumbs={[{ label: "Admin", href: "/admin" }, { label: "Users", href: "/admin/users" }, { label: "New" }]} />
      <AdminNav can={(k) => user.can(k)} current="users" />
      <Section>
        <CreateUserForm roles={roles} employees={unlinked} />
      </Section>
    </div>
  );
}

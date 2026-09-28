import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { DeleteRoleButton, RoleDialog, RolePermissionsForm } from "@/components/admin/role-forms";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getRolesWithPermissions } from "@/lib/data/admin";
import { getPermissions } from "@/lib/data/master";

export const metadata: Metadata = { title: "Roles" };

export default async function AdminRolesPage() {
  const user = await requirePagePermission(PERMISSIONS.admin.roles);
  const [roles, permissions] = await Promise.all([getRolesWithPermissions(), getPermissions()]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Role Management"
        description="Create roles and assign permissions. Users inherit every permission of their roles."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Roles" }]}
        actions={<RoleDialog />}
      />
      <AdminNav can={(k) => user.can(k)} current="roles" />
      <div className="flex flex-col gap-5">
        {roles.map((role) => (
          <Section
            key={role.id}
            title={
              <span className="inline-flex items-center gap-2">
                {role.name}
                {role.is_system ? <span className="rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">System</span> : null}
                <span className="text-xs font-normal text-muted-foreground">{role.userCount} user{role.userCount === 1 ? "" : "s"}</span>
              </span>
            }
            description={role.description ?? undefined}
            actions={
              <>
                <RoleDialog role={role} />
                <DeleteRoleButton id={role.id} name={role.name} isSystem={role.is_system} userCount={role.userCount} />
              </>
            }
          >
            <RolePermissionsForm role={role} permissions={permissions} />
          </Section>
        ))}
      </div>
    </div>
  );
}

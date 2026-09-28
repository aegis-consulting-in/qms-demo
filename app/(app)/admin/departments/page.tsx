import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { DepartmentManager } from "@/components/admin/master-data";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getDepartments } from "@/lib/data/master";

export const metadata: Metadata = { title: "Departments" };

export default async function AdminDepartmentsPage() {
  const user = await requirePagePermission(PERMISSIONS.admin.settings);
  const departments = await getDepartments(true);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Departments"
        description="Organisation units used on employees, assets, suppliers and audits."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Departments" }]}
      />
      <AdminNav can={(k) => user.can(k)} current="departments" />
      <Section>
        <DepartmentManager departments={departments} />
      </Section>
    </div>
  );
}

import type { Metadata } from "next";
import { AuditForm } from "@/components/audits/audit-form";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getDepartments, getEmployeeOptions } from "@/lib/data/master";

export const metadata: Metadata = { title: "New audit" };

export default async function NewAuditPage() {
  await requirePagePermission(PERMISSIONS.audit.create);
  const [departments, employees] = await Promise.all([getDepartments(), getEmployeeOptions()]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="New audit" crumbs={[{ label: "Audits", href: "/audits" }, { label: "New" }]} />
      <Section>
        <AuditForm departments={departments} employees={employees} />
      </Section>
    </div>
  );
}

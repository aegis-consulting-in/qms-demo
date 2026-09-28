import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuditForm } from "@/components/audits/audit-form";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission, requireUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getAudit } from "@/lib/data/audits";
import { getDepartments, getEmployeeOptions } from "@/lib/data/master";

export const metadata: Metadata = { title: "Edit audit" };

export default async function EditAuditPage({ params }: PageProps<"/audits/[id]/edit">) {
  const user = await requireUser();
  const { id } = await params;
  const audit = await getAudit(id);
  if (!audit) notFound();

  const isAuditor = Boolean(user.employee && audit.auditor_id === user.employee.id);
  if (!user.can(PERMISSIONS.audit.edit) && !isAuditor) {
    await requirePagePermission(PERMISSIONS.audit.edit);
  }

  const [departments, employees] = await Promise.all([getDepartments(), getEmployeeOptions()]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Edit ${audit.title}`}
        crumbs={[{ label: "Audits", href: "/audits" }, { label: audit.title, href: `/audits/${audit.id}` }, { label: "Edit" }]}
      />
      <Section>
        <AuditForm audit={audit} departments={departments} employees={employees} />
      </Section>
    </div>
  );
}

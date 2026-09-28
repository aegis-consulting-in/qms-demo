import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MaintenanceRecordForm } from "@/components/maintenance/record-form";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission, requireUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getEmployeeOptions } from "@/lib/data/master";
import { getAssetOptions, getMaintenanceRecord } from "@/lib/data/maintenance";

export const metadata: Metadata = { title: "Edit maintenance record" };

export default async function EditMaintenanceRecordPage({ params }: PageProps<"/maintenance/[id]/edit">) {
  const user = await requireUser();
  const { id } = await params;
  const record = await getMaintenanceRecord(id);
  if (!record) notFound();

  const isAssignee = Boolean(user.employee && record.assigned_to === user.employee.id);
  if (!user.can(PERMISSIONS.maintenance.edit) && !isAssignee) {
    await requirePagePermission(PERMISSIONS.maintenance.edit);
  }

  const [assets, employees] = await Promise.all([getAssetOptions(), getEmployeeOptions()]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Edit ${record.title}`}
        crumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: record.title, href: `/maintenance/${record.id}` }, { label: "Edit" }]}
      />
      <Section>
        <MaintenanceRecordForm
          record={record}
          assets={assets}
          employees={employees}
          limited={!user.can(PERMISSIONS.maintenance.edit) && isAssignee}
        />
      </Section>
    </div>
  );
}

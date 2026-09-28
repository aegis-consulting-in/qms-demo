import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentsPanel } from "@/components/documents/documents-panel";
import { DetailList } from "@/components/shared/data-table";
import { EntityActions } from "@/components/shared/entity-actions";
import { PageHeader, Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { deleteMaintenanceRecordAction } from "@/lib/actions/maintenance";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getMaintenanceRecord } from "@/lib/data/maintenance";
import { formatDate, formatDateTime, fullName, humanize, isOverdue } from "@/lib/format";

export const metadata: Metadata = { title: "Maintenance record" };

export default async function MaintenanceRecordPage({ params }: PageProps<"/maintenance/[id]">) {
  const user = await requirePagePermission(PERMISSIONS.maintenance.view);
  const { id } = await params;
  const record = await getMaintenanceRecord(id);
  if (!record) notFound();

  const isAssignee = Boolean(user.employee && record.assigned_to === user.employee.id);
  const canEdit = user.can(PERMISSIONS.maintenance.edit) || isAssignee;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {record.title}
            <StatusBadge status={record.status} />
          </span>
        }
        description={[record.asset?.asset_code, record.asset?.name].filter(Boolean).join(" · ")}
        crumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: record.title }]}
        actions={
          <EntityActions
            id={record.id}
            editHref={`/maintenance/${record.id}/edit`}
            canEdit={canEdit}
            canDelete={user.can(PERMISSIONS.maintenance.delete)}
            deleteAction={deleteMaintenanceRecordAction}
            deleteTitle="Archive this maintenance record?"
            deleteDescription="The record will be hidden from lists. Documents are kept."
            afterDeleteHref="/maintenance"
          />
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title="Schedule" className="lg:col-span-2">
          {record.description ? <p className="mb-4 text-sm whitespace-pre-line">{record.description}</p> : null}
          <DetailList
            items={[
              { label: "Asset", value: record.asset ? `${record.asset.asset_code} · ${record.asset.name}` : "—" },
              { label: "Location", value: record.asset?.location ?? "—" },
              { label: "Type", value: humanize(record.maintenance_type) },
              { label: "Frequency", value: humanize(record.frequency) },
              { label: "Assigned technician", value: fullName(record.assignee) },
              { label: "Notes", value: record.notes ?? "—" },
            ]}
          />
        </Section>
        <Section title="Dates">
          <DetailList
            className="sm:grid-cols-1"
            items={[
              { label: "Scheduled", value: formatDate(record.scheduled_date) },
              {
                label: "Due",
                value: (
                  <span className={isOverdue(record.due_date) && record.status !== "completed" ? "font-medium text-destructive" : undefined}>
                    {formatDate(record.due_date)}
                  </span>
                ),
              },
              { label: "Completed", value: formatDate(record.completed_date) },
              { label: "Created", value: formatDateTime(record.created_at) },
              { label: "Updated", value: formatDateTime(record.updated_at) },
            ]}
          />
        </Section>
      </div>

      {user.can(PERMISSIONS.maintenance.create) ? (
        <p className="text-sm text-muted-foreground">
          Schedule another job for this asset from{" "}
          <Link href={`/maintenance/new?assetId=${record.asset_id}`} className="text-brand hover:underline">
            New record
          </Link>
          .
        </p>
      ) : null}

      <DocumentsPanel module="preventive-maintenance" entityId={record.id} title="Maintenance documents" />
    </div>
  );
}

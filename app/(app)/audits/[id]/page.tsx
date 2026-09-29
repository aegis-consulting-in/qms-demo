import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CorrectiveActionsPanel } from "@/components/audits/actions-panel";
import { FindingsPanel } from "@/components/audits/findings-panel";
import { DocumentsPanel } from "@/components/documents/documents-panel";
import { DetailList } from "@/components/shared/data-table";
import { EntityActions } from "@/components/shared/entity-actions";
import { PageHeader, Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { deleteAuditAction } from "@/lib/actions/audits";
import { requireUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getAudit, getAuditFindings, getCorrectiveActions } from "@/lib/data/audits";
import { getEmployeeOptions } from "@/lib/data/master";
import { formatDate, formatDateTime, fullName } from "@/lib/format";
import { one } from "@/lib/data/helpers";

export const metadata: Metadata = { title: "Audit" };

export default async function AuditDetailPage({ params }: PageProps<"/audits/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const audit = await getAudit(id);
  if (!audit) notFound();

  const isAuditor = Boolean(user.employee && audit.auditor_id === user.employee.id);
  const canEdit = user.can(PERMISSIONS.audit.edit) || isAuditor;
  const [findings, actions, employees] = await Promise.all([
    getAuditFindings(id),
    getCorrectiveActions(id),
    canEdit ? getEmployeeOptions() : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {audit.title}
            <StatusBadge status={audit.audit_type} />
            <StatusBadge status={audit.status} />
          </span>
        }
        description={[audit.code, audit.process_name].filter(Boolean).join(" · ")}
        crumbs={[{ label: "Audits", href: "/audits" }, { label: audit.title }]}
        actions={
          <EntityActions
            id={audit.id}
            editHref={`/audits/${audit.id}/edit`}
            canEdit={canEdit}
            canDelete={user.can(PERMISSIONS.audit.delete)}
            deleteAction={deleteAuditAction}
            deleteTitle="Archive this audit?"
            deleteDescription="The audit will be hidden from lists. Findings, actions and documents are kept."
            afterDeleteHref="/audits"
          />
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title="Audit details" className="lg:col-span-2">
          <DetailList
            items={[
              { label: "Department", value: audit.department?.name ?? "—" },
              { label: "Auditor", value: fullName(one(audit.auditor)) },
              { label: "Audit type", value: <StatusBadge status={audit.audit_type} /> },
              { label: "Audit date", value: formatDate(audit.audit_date) },
              { label: "Responsibility", value: audit.responsibility ?? "—" },
              { label: "Applicable clauses", value: audit.applicable_clauses ?? "—" },
              { label: "Created", value: formatDateTime(audit.created_at) },
            ]}
          />
          {audit.summary ? <p className="mt-4 text-sm whitespace-pre-line">{audit.summary}</p> : null}
        </Section>
        <Section title="Process notes">
          <DetailList
            className="sm:grid-cols-1"
            items={[
              { label: "Inputs", value: audit.inputs ?? "—" },
              { label: "Activities", value: audit.activities ?? "—" },
              { label: "Outputs", value: audit.outputs ?? "—" },
              { label: "Interactions", value: audit.interactions ?? "—" },
              { label: "Notes", value: audit.notes ?? "—" },
            ]}
          />
        </Section>
      </div>

      <Section title="Findings" description={`${findings.length} recorded`}>
        <FindingsPanel auditId={audit.id} findings={findings} canEdit={canEdit} />
      </Section>

      <Section title="Corrective actions" description={`${actions.length} recorded`}>
        <CorrectiveActionsPanel
          auditId={audit.id}
          actions={actions.map((a) => ({ ...a, owner: one(a.owner), finding: one(a.finding) }))}
          findings={findings}
          employees={employees}
          canEdit={canEdit}
        />
      </Section>

      <DocumentsPanel module="audit" entityId={audit.id} title="Audit documents" />
    </div>
  );
}

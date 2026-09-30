import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentsPanel } from "@/components/documents/documents-panel";
import { DetailList } from "@/components/shared/data-table";
import { PageHeader, Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { AssignmentsTable } from "@/components/training/assignments-table";
import { TrainingActions } from "@/components/training/training-actions";
import { requireUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getDepartments, getEmployeeOptions } from "@/lib/data/master";
import { getTraining, getTrainingAssignments } from "@/lib/data/training";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Training" };

export default async function TrainingDetailPage({ params }: PageProps<"/training/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const training = await getTraining(id);
  if (!training) notFound();

  const canAssign = user.canAny([PERMISSIONS.training.assign, PERMISSIONS.training.team]);
  const canManageAssignments = canAssign;

  const [assignments, employees, departments] = await Promise.all([
    getTrainingAssignments(id),
    canAssign ? getEmployeeOptions() : Promise.resolve([]),
    canAssign ? getDepartments() : Promise.resolve([]),
  ]);

  const live = new Set(["assigned", "in_progress", "overdue"]);
  const alreadyAssigned = assignments.filter((a) => live.has(a.status)).map((a) => a.employee_id);
  const myAssignment = user.employee ? assignments.find((a) => a.employee_id === user.employee!.id) : undefined;
  const completed = assignments.filter((a) => a.status === "completed").length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {training.name}
            <StatusBadge status={training.status?.name} />
            {training.deleted_at ? <StatusBadge status="Archived" tone="muted" /> : null}
          </span>
        }
        description={[training.code, training.level?.name, training.duration_hours ? `${training.duration_hours} hours` : null].filter(Boolean).join(" · ")}
        crumbs={[{ label: "HR", href: "/training" }, { label: training.name }]}
        actions={
          <TrainingActions
            training={training}
            canEdit={user.can(PERMISSIONS.training.edit)}
            canDelete={user.can(PERMISSIONS.training.delete)}
            canAssign={canAssign}
            employees={employees}
            departments={departments}
            alreadyAssigned={alreadyAssigned}
          />
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title="About this training" className="lg:col-span-2">
          {training.description ? <p className="mb-4 text-sm whitespace-pre-line">{training.description}</p> : null}
          <DetailList
            items={[
              { label: "Code", value: training.code ?? "—" },
              { label: "Level", value: training.level?.name ?? "—" },
              { label: "Duration", value: training.duration_hours ? `${training.duration_hours} hours` : "—" },
              { label: "Status", value: <StatusBadge status={training.status?.name} /> },
              { label: "Created", value: formatDateTime(training.created_at) },
              { label: "Last updated", value: formatDateTime(training.updated_at) },
            ]}
          />
        </Section>

        <Section title="Summary">
          <DetailList
            className="sm:grid-cols-1"
            items={[
              { label: "Assignments", value: assignments.length },
              { label: "Active", value: alreadyAssigned.length },
              { label: "Completed", value: completed },
              ...(myAssignment
                ? [{ label: "Your status", value: <StatusBadge status={myAssignment.status} /> }]
                : []),
            ]}
          />
        </Section>
      </div>

      {canManageAssignments || myAssignment ? (
        <Section title="Assignments" description={canManageAssignments ? "Everyone assigned to this training." : "Your assignment for this training."}>
          <AssignmentsTable
            rows={canManageAssignments ? assignments : myAssignment ? [myAssignment] : []}
            show="employee"
            mode={canManageAssignments ? "manage" : "self"}
            canDelete={user.can(PERMISSIONS.training.assign)}
            emptyTitle="Nobody is assigned yet"
            emptyDescription="Use the Assign button to add employees."
          />
        </Section>
      ) : null}

      <DocumentsPanel module="training" entityId={training.id} title="Training documents" />
    </div>
  );
}

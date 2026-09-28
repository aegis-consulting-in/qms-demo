import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentsPanel } from "@/components/documents/documents-panel";
import { ProjectMembers } from "@/components/projects/project-members";
import { DetailList } from "@/components/shared/data-table";
import { EntityActions } from "@/components/shared/entity-actions";
import { PageHeader, Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { deleteProjectAction } from "@/lib/actions/projects";
import { requireUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getEmployeeOptions } from "@/lib/data/master";
import { getProject, getProjectMembers } from "@/lib/data/projects";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectDetailPage({ params }: PageProps<"/projects/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const isPM = Boolean(user.employee && project.manager_id === user.employee.id);
  const canEdit = user.can(PERMISSIONS.project.edit) || isPM;
  const [members, employees] = await Promise.all([getProjectMembers(id), canEdit ? getEmployeeOptions() : Promise.resolve([])]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {project.name}
            <StatusBadge status={project.status} />
            <StatusBadge status={project.priority} />
          </span>
        }
        description={project.code}
        crumbs={[{ label: "Projects", href: "/projects" }, { label: project.name }]}
        actions={
          <EntityActions
            id={project.id}
            editHref={`/projects/${project.id}/edit`}
            canEdit={canEdit}
            canDelete={user.can(PERMISSIONS.project.delete)}
            deleteAction={deleteProjectAction}
            deleteTitle="Delete this project?"
            deleteDescription="The project will be archived and hidden. Documents and members are kept."
            afterDeleteHref="/projects"
          />
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title="Overview" className="lg:col-span-2">
          {project.description ? <p className="mb-4 text-sm whitespace-pre-line">{project.description}</p> : null}
          <DetailList
            items={[
              {
                label: "Project manager",
                value: project.manager ? (
                  <Link href={`/employees/${project.manager.id}`} className="hover:underline">
                    {project.manager.first_name} {project.manager.last_name}
                  </Link>
                ) : (
                  "Unassigned"
                ),
              },
              { label: "Start date", value: formatDate(project.start_date) },
              { label: "Expected end", value: formatDate(project.expected_end_date) },
              { label: "Actual end", value: formatDate(project.actual_end_date) },
              { label: "Created", value: formatDateTime(project.created_at) },
              { label: "Updated", value: formatDateTime(project.updated_at) },
              { label: "Notes", value: project.notes ?? "—" },
            ]}
          />
        </Section>
        <Section title="Team" description={`${members.length} member${members.length === 1 ? "" : "s"}`}>
          <ProjectMembers projectId={project.id} members={members} employees={employees} canManage={canEdit} />
        </Section>
      </div>

      <DocumentsPanel module="project" entityId={project.id} title="Project documents" />
    </div>
  );
}

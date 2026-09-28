import type { Metadata } from "next";
import { ProjectForm } from "@/components/projects/project-form";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getEmployeeOptions } from "@/lib/data/master";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage() {
  await requirePagePermission(PERMISSIONS.project.create);
  const employees = await getEmployeeOptions();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="New project" crumbs={[{ label: "Projects", href: "/projects" }, { label: "New" }]} />
      <Section>
        <ProjectForm employees={employees} />
      </Section>
    </div>
  );
}

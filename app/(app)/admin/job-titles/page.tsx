import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { JobTitleManager } from "@/components/admin/master-data";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getJobTitles } from "@/lib/data/master";

export const metadata: Metadata = { title: "Job titles" };

export default async function AdminJobTitlesPage() {
  const user = await requirePagePermission(PERMISSIONS.admin.settings);
  const titles = await getJobTitles(true);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Job Titles" description="Master list used on employee records." crumbs={[{ label: "Admin", href: "/admin" }, { label: "Job titles" }]} />
      <AdminNav can={(k) => user.can(k)} current="job-titles" />
      <Section>
        <JobTitleManager titles={titles} />
      </Section>
    </div>
  );
}

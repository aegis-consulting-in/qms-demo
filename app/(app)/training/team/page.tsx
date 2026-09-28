import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangleIcon, CheckCircle2Icon, ClipboardListIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterSelect, ListToolbar, ClearFilters } from "@/components/shared/list-toolbar";
import { PageHeader, Section } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { StatCard, StatGrid } from "@/components/shared/stat-card";
import { AssignmentsTable } from "@/components/training/assignments-table";
import { requireUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getTeamAssignments, listAllAssignments } from "@/lib/data/training";
import { humanize, isOverdue } from "@/lib/format";
import { ASSIGNMENT_STATUSES } from "@/lib/validation/training";
import { paginationSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: "Manage Team Trainings" };

/**
 * Managers see their reporting chain (RLS enforces membership); users with
 * training.assign see the whole organisation.
 */
export default async function TeamTrainingsPage({ searchParams }: PageProps<"/training/team">) {
  const user = await requireUser();
  const orgWide = user.can(PERMISSIONS.training.assign);
  const teamScope = user.isManager && user.can(PERMISSIONS.training.team) && user.employee;
  if (!orgWide && !teamScope) redirect("/unauthorized");

  const params = await searchParams;
  const filters = paginationSchema.parse({ ...params, pageSize: params.pageSize ?? "25" });
  const status = typeof params.status === "string" ? params.status : undefined;

  let rows: Awaited<ReturnType<typeof getTeamAssignments>>;
  let total: number;
  let base: typeof rows;

  if (orgWide) {
    const res = await listAllAssignments({ ...filters, status });
    rows = res.rows;
    total = res.total;
    base = rows;
  } else {
    const all = await getTeamAssignments(user.employee!.id);
    const filtered = status ? all.filter((a) => a.status === status) : all;
    const from = (filters.page - 1) * filters.pageSize;
    rows = filtered.slice(from, from + filters.pageSize);
    total = filtered.length;
    base = all;
  }
  const result = { rows, total };
  const overdue = base.filter((a) => a.status === "overdue" || (isOverdue(a.due_date) && (a.status === "assigned" || a.status === "in_progress"))).length;
  const people = new Set(base.map((a) => a.employee_id)).size;
  const completed = base.filter((a) => a.status === "completed").length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Manage Team Trainings"
        description={orgWide ? "All training assignments across the organisation." : "Assignments for everyone in your reporting line."}
        crumbs={[{ label: "Training", href: "/training" }, { label: "Team" }]}
        actions={
          <Button render={<Link href="/training/assign" />}>
            <UserPlusIcon /> Assign training
          </Button>
        }
      />

      <StatGrid>
        <StatCard label="Assignments" value={result.total} icon={ClipboardListIcon} />
        <StatCard label="People" value={people} icon={UsersIcon} />
        <StatCard label="Overdue" value={overdue} icon={AlertTriangleIcon} tone={overdue ? "danger" : "default"} />
        <StatCard label="Completed" value={completed} icon={CheckCircle2Icon} tone="success" />
      </StatGrid>

      <Section>
        <div className="flex flex-col gap-3">
          <ListToolbar>
            <FilterSelect param="status" placeholder="All statuses" options={ASSIGNMENT_STATUSES.map((s) => ({ value: s, label: humanize(s) }))} ariaLabel="Status" />
            <ClearFilters keys={["status"]} />
          </ListToolbar>
          <AssignmentsTable rows={result.rows} show="both" mode="manage" canDelete={orgWide} emptyTitle="No assignments" emptyDescription="Assign a training to get started." />
          <Pagination page={filters.page} pageSize={filters.pageSize} total={result.total} />
        </div>
      </Section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ListToolbar, SearchInput } from "@/components/shared/list-toolbar";
import { PageHeader, Section } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireUser } from "@/lib/auth/guards";
import { listEmployees, type EmployeeWithRelations } from "@/lib/data/employees";
import { createClient } from "@/lib/supabase/server";
import { paginationSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: "Employee Details" };

/**
 * Training → Employee Details. Lists the people the caller can see (RLS:
 * self, reporting line, or everyone with employee.view) with a summary of
 * their training status.
 */
export default async function TrainingEmployeesPage({ searchParams }: PageProps<"/training/employees">) {
  await requireUser();
  const params = await searchParams;
  const filters = paginationSchema.parse(params);
  const { rows, total } = await listEmployees({ ...filters, status: "active" });

  // Aggregate assignment counts for the visible employees (RLS applies again).
  const supabase = await createClient();
  const ids = rows.map((r) => r.id);
  const { data: assignments } = ids.length
    ? await supabase.from("training_assignments").select("employee_id, status").in("employee_id", ids)
    : { data: [] as { employee_id: string; status: string }[] };

  const summary = new Map<string, { open: number; overdue: number; completed: number }>();
  for (const a of assignments ?? []) {
    const s = summary.get(a.employee_id) ?? { open: 0, overdue: 0, completed: 0 };
    if (a.status === "completed") s.completed += 1;
    else if (a.status === "overdue") s.overdue += 1;
    else if (a.status === "assigned" || a.status === "in_progress") s.open += 1;
    summary.set(a.employee_id, s);
  }

  const columns: Column<EmployeeWithRelations>[] = [
    {
      key: "name",
      header: "Employee",
      cell: (e) => (
        <div className="min-w-0">
          <Link href={`/employees/${e.id}`} className="font-medium hover:underline">
            {e.first_name} {e.last_name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {e.employee_code} · {e.job_title?.name ?? "—"}
          </p>
        </div>
      ),
    },
    { key: "dept", header: "Department", cell: (e) => e.department?.name ?? "—", hideBelow: "md" },
    { key: "manager", header: "Reports to", cell: (e) => (e.manager ? `${e.manager.first_name} ${e.manager.last_name}` : "—"), hideBelow: "lg" },
    {
      key: "training",
      header: "Trainings",
      cell: (e) => {
        const s = summary.get(e.id) ?? { open: 0, overdue: 0, completed: 0 };
        return (
          <div className="flex flex-wrap gap-1">
            <StatusBadge status={`${s.open} open`} tone="info" />
            {s.overdue ? <StatusBadge status={`${s.overdue} overdue`} tone="danger" /> : null}
            <StatusBadge status={`${s.completed} done`} tone="success" />
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Employee Details" description="Training status for the people you can see." crumbs={[{ label: "Training", href: "/training" }, { label: "Employee Details" }]} />
      <Section>
        <div className="flex flex-col gap-3">
          <ListToolbar>
            <SearchInput placeholder="Search employees…" className="w-full sm:w-72" />
          </ListToolbar>
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyTitle="No employees visible" emptyDescription="You can see yourself and anyone who reports to you." />
          <Pagination page={filters.page} pageSize={filters.pageSize} total={total} />
        </div>
      </Section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, UserCheckIcon, UsersIcon, UserCogIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ClearFilters, FilterSelect, ListToolbar, SearchInput, SortSelect } from "@/components/shared/list-toolbar";
import { PageHeader, Section } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { StatCard, StatGrid } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getEmployeeStats, listEmployees, type EmployeeWithRelations } from "@/lib/data/employees";
import { getDepartments } from "@/lib/data/master";
import { formatDate } from "@/lib/format";
import { paginationSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage({ searchParams }: PageProps<"/employees">) {
  const user = await requirePagePermission(PERMISSIONS.employee.view);
  const params = await searchParams;
  const filters = paginationSchema.parse(params);
  const departmentId = typeof params.department === "string" ? params.department : undefined;
  const status = (typeof params.status === "string" ? params.status : "active") as "active" | "inactive" | "all";

  const [{ rows, total }, stats, departments] = await Promise.all([
    listEmployees({ ...filters, departmentId, status }),
    getEmployeeStats(),
    getDepartments(),
  ]);

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
            {e.employee_code} · {e.email}
          </p>
        </div>
      ),
    },
    { key: "department", header: "Department", cell: (e) => e.department?.name ?? "—", hideBelow: "md" },
    { key: "title", header: "Job title", cell: (e) => e.job_title?.name ?? "—", hideBelow: "lg" },
    { key: "manager", header: "Reports to", cell: (e) => (e.manager ? `${e.manager.first_name} ${e.manager.last_name}` : "—"), hideBelow: "lg" },
    { key: "joined", header: "Joined", cell: (e) => formatDate(e.joining_date), hideBelow: "xl" },
    {
      key: "status",
      header: "Status",
      cell: (e) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge status={e.is_active ? "active" : "inactive"} />
          {e.is_manager ? <StatusBadge status="Manager" tone="info" /> : null}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Employee Management"
        description="Directory of people, departments and reporting lines."
        crumbs={[{ label: "Employees" }]}
        actions={
          user.can(PERMISSIONS.employee.create) ? (
            <Button render={<Link href="/employees/new" />}>
              <PlusIcon /> New employee
            </Button>
          ) : null
        }
      />

      <StatGrid className="lg:grid-cols-3">
        <StatCard label="Total employees" value={stats.total} icon={UsersIcon} />
        <StatCard label="Active" value={stats.active} icon={UserCheckIcon} tone="success" />
        <StatCard label="Managers" value={stats.managers} icon={UserCogIcon} />
      </StatGrid>

      <Section>
        <div className="flex flex-col gap-3">
          <ListToolbar>
            <SearchInput placeholder="Search name, email or code…" className="w-full sm:w-72" />
            <FilterSelect param="department" placeholder="All departments" options={departments.map((d) => ({ value: d.id, label: d.name }))} ariaLabel="Department" />
            <FilterSelect
              param="status"
              placeholder="Active"
              options={[
                { value: "inactive", label: "Inactive" },
                { value: "all", label: "All status" },
              ]}
              ariaLabel="Status"
            />
            <SortSelect
              options={[
                { value: "name", label: "Name" },
                { value: "code", label: "Code" },
                { value: "email", label: "Email" },
                { value: "joined", label: "Joined" },
              ]}
            />
            <ClearFilters keys={["q", "department", "status", "sort", "dir"]} />
          </ListToolbar>
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyTitle="No employees match" emptyDescription="Try adjusting the search or filters." />
          <Pagination page={filters.page} pageSize={filters.pageSize} total={total} />
        </div>
      </Section>
    </div>
  );
}

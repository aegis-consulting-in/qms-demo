import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentsPanel } from "@/components/documents/documents-panel";
import { EmployeeActions } from "@/components/employees/employee-actions";
import { DataTable, DetailList, type Column } from "@/components/shared/data-table";
import { PageHeader, Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getDirectReports, getEmployee, getEmployeeRoles, getEmployeeTrainingHistory } from "@/lib/data/employees";
import { formatDate, isOverdue } from "@/lib/format";

export const metadata: Metadata = { title: "Employee" };

export default async function EmployeeDetailPage({ params }: PageProps<"/employees/[id]">) {
  const user = await requireUser();
  const { id } = await params;

  // RLS decides visibility: own record, direct/indirect reports, or employee.view.
  const employee = await getEmployee(id);
  if (!employee) notFound();

  const [history, reports, roles] = await Promise.all([
    getEmployeeTrainingHistory(id),
    getDirectReports(id),
    employee.user_id ? getEmployeeRoles(employee.user_id) : Promise.resolve([]),
  ]);

  type Assignment = (typeof history)[number];
  const historyColumns: Column<Assignment>[] = [
    {
      key: "training",
      header: "Training",
      cell: (a) => (
        <Link href={`/training/${a.training_id}`} className="font-medium hover:underline">
          {a.training?.name ?? "—"}
        </Link>
      ),
    },
    { key: "level", header: "Level", cell: (a) => a.training?.level?.name ?? "—", hideBelow: "md" },
    { key: "assigned", header: "Assigned", cell: (a) => formatDate(a.assigned_date), hideBelow: "lg" },
    {
      key: "due",
      header: "Due",
      cell: (a) => (
        <span className={isOverdue(a.due_date) && a.status !== "completed" ? "text-destructive" : undefined}>{formatDate(a.due_date)}</span>
      ),
    },
    { key: "completed", header: "Completed", cell: (a) => formatDate(a.completion_date), hideBelow: "lg" },
    { key: "status", header: "Status", cell: (a) => <StatusBadge status={a.status} /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {employee.first_name} {employee.last_name}
            <StatusBadge status={employee.is_active ? "active" : "inactive"} />
            {employee.is_manager ? <StatusBadge status="Manager" tone="info" /> : null}
          </span>
        }
        description={`${employee.employee_code} · ${employee.job_title?.name ?? "No job title"} · ${employee.department?.name ?? "No department"}`}
        crumbs={[{ label: "Employees", href: "/employees" }, { label: `${employee.first_name} ${employee.last_name}` }]}
        actions={
          <EmployeeActions
            id={employee.id}
            isActive={employee.is_active}
            canEdit={user.can(PERMISSIONS.employee.edit)}
            canDelete={user.can(PERMISSIONS.employee.delete)}
          />
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title="Details" className="lg:col-span-2">
          <DetailList
            items={[
              { label: "Email", value: <a href={`mailto:${employee.email}`} className="hover:underline">{employee.email}</a> },
              { label: "Phone", value: employee.phone ?? "—" },
              { label: "Department", value: employee.department?.name ?? "—" },
              { label: "Job title", value: employee.job_title?.name ?? "—" },
              {
                label: "Reports to",
                value: employee.manager ? (
                  <Link href={`/employees/${employee.manager.id}`} className="hover:underline">
                    {employee.manager.first_name} {employee.manager.last_name}
                  </Link>
                ) : (
                  "—"
                ),
              },
              { label: "Joining date", value: formatDate(employee.joining_date) },
              { label: "Login account", value: employee.user_id ? <StatusBadge status="Linked" tone="success" /> : <StatusBadge status="No login" tone="muted" /> },
              {
                label: "Roles",
                value: roles.length ? (
                  <span className="flex flex-wrap gap-1">
                    {roles.map((r) => (
                      <StatusBadge key={r.id} status={r.name} tone="info" />
                    ))}
                  </span>
                ) : (
                  "—"
                ),
              },
              { label: "Notes", value: employee.notes ?? "—" },
            ]}
          />
        </Section>

        <Section title="Direct reports" description={`${reports.length} people`}>
          {reports.length ? (
            <ul className="divide-y text-sm">
              {reports.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <Link href={`/employees/${r.id}`} className="block truncate font-medium hover:underline">
                      {r.first_name} {r.last_name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{r.job_title?.name ?? r.employee_code}</p>
                  </div>
                  <StatusBadge status={r.is_active ? "active" : "inactive"} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No direct reports.</p>
          )}
        </Section>
      </div>

      <Section title="Training history" description={`${history.length} assignment${history.length === 1 ? "" : "s"}`}>
        <DataTable columns={historyColumns} rows={history} rowKey={(r) => r.id} emptyTitle="No trainings assigned yet" />
      </Section>

      <DocumentsPanel module="employee" entityId={employee.id} title="Employee documents" />
    </div>
  );
}

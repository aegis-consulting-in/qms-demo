import Link from "next/link";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, isOverdue } from "@/lib/format";
import type { AssignmentStatus } from "@/lib/types/database";
import { AssignmentStatusControl } from "./assignment-status-control";

export type AssignmentRowData = {
  id: string;
  training_id: string;
  employee_id: string;
  assigned_date: string;
  due_date: string | null;
  completion_date: string | null;
  status: AssignmentStatus;
  notes: string | null;
  training: { id: string; name: string; code: string | null; duration_hours: number | null; level: { name: string } | null; status: { name: string } | null } | null;
  employee: { id: string; employee_code: string; first_name: string; last_name: string; email: string; department: { name: string } | null } | null;
};

export function AssignmentsTable({
  rows,
  show,
  mode,
  canDelete = false,
  emptyTitle = "No assignments",
  emptyDescription,
}: {
  rows: AssignmentRowData[];
  /** Which entity column to show; the other is implied by the page. */
  show: "training" | "employee" | "both";
  /** undefined → read-only */
  mode?: "self" | "manage";
  canDelete?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const columns: Column<AssignmentRowData>[] = [];

  if (show !== "employee") {
    columns.push({
      key: "training",
      header: "Training",
      cell: (a) => (
        <div className="min-w-0">
          <Link href={`/training/${a.training_id}`} className="font-medium hover:underline">
            {a.training?.name ?? "—"}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {[a.training?.code, a.training?.level?.name, a.training?.duration_hours ? `${a.training.duration_hours} h` : null].filter(Boolean).join(" · ")}
          </p>
        </div>
      ),
    });
  }
  if (show !== "training") {
    columns.push({
      key: "employee",
      header: "Employee",
      cell: (a) => (
        <div className="min-w-0">
          <Link href={`/employees/${a.employee_id}`} className="font-medium hover:underline">
            {a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : "—"}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {[a.employee?.employee_code, a.employee?.department?.name].filter(Boolean).join(" · ")}
          </p>
        </div>
      ),
    });
  }
  columns.push(
    { key: "assigned", header: "Assigned", cell: (a) => formatDate(a.assigned_date), hideBelow: "lg" },
    {
      key: "due",
      header: "Due",
      cell: (a) => (
        <span className={isOverdue(a.due_date) && a.status !== "completed" && a.status !== "cancelled" ? "font-medium text-destructive" : undefined}>
          {formatDate(a.due_date)}
        </span>
      ),
    },
    { key: "completed", header: "Completed", cell: (a) => formatDate(a.completion_date), hideBelow: "xl" },
    {
      key: "status",
      header: "Status",
      cell: (a) => (mode ? <AssignmentStatusControl id={a.id} status={a.status} mode={mode} canDelete={canDelete} /> : <StatusBadge status={a.status} />),
    },
  );

  return <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyTitle={emptyTitle} emptyDescription={emptyDescription} />;
}

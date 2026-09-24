"use client";

import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  /** Hide the column below the given breakpoint to keep small screens readable. */
  hideBelow?: "sm" | "md" | "lg" | "xl";
  align?: "left" | "right" | "center";
}

const hideClasses = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
} as const;

const alignClasses = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  emptyTitle = "Nothing here yet",
  emptyMessage = "Create a record to get started.",
  onRowClick,
  activeRowId,
}: {
  columns: Array<Column<T>>;
  rows: T[];
  emptyTitle?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  activeRowId?: string | null;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cx(
                  "px-4 py-2.5 text-xs font-semibold tracking-wide text-slate-500 uppercase whitespace-nowrap",
                  alignClasses[column.align ?? "left"],
                  column.hideBelow ? hideClasses[column.hideBelow] : undefined,
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cx(
                "transition-colors",
                onRowClick ? "cursor-pointer hover:bg-indigo-50/40" : "hover:bg-slate-50/70",
                activeRowId === row.id ? "bg-indigo-50/60" : undefined,
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cx(
                    "px-4 py-3 align-middle text-slate-700",
                    alignClasses[column.align ?? "left"],
                    column.hideBelow ? hideClasses[column.hideBelow] : undefined,
                    column.className,
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
  icon,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon ?? <Inbox className="h-5 w-5" />}
      </span>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {message ? <p className="max-w-sm text-xs text-slate-500">{message}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function CellStack({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-slate-900">{primary}</p>
      {secondary ? <p className="truncate text-xs text-slate-500">{secondary}</p> : null}
    </div>
  );
}

export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-1">{children}</div>;
}

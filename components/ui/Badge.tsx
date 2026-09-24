import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

export type BadgeTone =
  | "slate"
  | "indigo"
  | "emerald"
  | "amber"
  | "rose"
  | "sky"
  | "violet"
  | "teal";

const tones: Record<BadgeTone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  teal: "bg-teal-50 text-teal-700 ring-teal-200",
};

export function Badge({
  tone = "slate",
  children,
  className,
  dot = false,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" /> : null}
      {children}
    </span>
  );
}

const statusTones: Record<string, BadgeTone> = {
  Active: "emerald",
  Inactive: "slate",
  Pending: "slate",
  "In Progress": "sky",
  "Waiting for Approval": "amber",
  Approved: "emerald",
  Rejected: "rose",
  Scheduled: "sky",
  "Due Soon": "amber",
  Overdue: "rose",
  Completed: "emerald",
  Open: "sky",
  Cancelled: "slate",
  "To Do": "slate",
  Blocked: "rose",
  Compliant: "emerald",
  "Minor NC": "amber",
  "Major NC": "rose",
  "Not Applicable": "slate",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={statusTones[status] ?? "slate"} dot className={className}>
      {status}
    </Badge>
  );
}

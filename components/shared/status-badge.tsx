import { cn } from "cn";
import { humanize } from "@/lib/format";

const TONES = {
  neutral: "bg-secondary text-secondary-foreground",
  info: "bg-brand/10 text-brand-dark",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-amber-800",
  danger: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
} as const;

type Tone = keyof typeof TONES;

const STATUS_TONES: Record<string, Tone> = {
  // generic
  active: "success",
  inactive: "muted",
  draft: "neutral",
  archived: "muted",
  completed: "success",
  cancelled: "muted",
  closed: "muted",
  verified: "success",
  // assignments / maintenance
  assigned: "info",
  in_progress: "info",
  overdue: "danger",
  scheduled: "neutral",
  due: "warning",
  // projects
  planning: "neutral",
  on_hold: "warning",
  planned: "neutral",
  // suppliers
  probationary: "warning",
  blacklisted: "danger",
  // findings
  open: "warning",
  observation: "neutral",
  minor: "info",
  major: "warning",
  critical: "danger",
  // priority
  low: "muted",
  medium: "info",
  high: "warning",
};

export function StatusBadge({ status, className, tone }: { status: string | null | undefined; className?: string; tone?: Tone }) {
  const key = (status ?? "").toLowerCase();
  const resolved = tone ?? STATUS_TONES[key] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[resolved],
        className,
      )}
    >
      {humanize(status)}
    </span>
  );
}

export function BooleanBadge({ value, trueLabel = "Yes", falseLabel = "No" }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return <StatusBadge status={value ? trueLabel : falseLabel} tone={value ? "success" : "muted"} />;
}

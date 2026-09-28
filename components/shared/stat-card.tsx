import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: string;
  tone?: "default" | "danger" | "success" | "warning";
  className?: string;
}) {
  const toneClass = {
    default: "text-brand bg-brand/10",
    danger: "text-destructive bg-destructive/10",
    success: "text-success bg-success/15",
    warning: "text-amber-700 bg-warning/20",
  }[tone];
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border bg-card px-3.5 py-3", className)}>
      {Icon ? (
        <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", toneClass)}>
          <Icon className="size-4" />
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="font-heading text-lg font-semibold tabular-nums leading-tight">{value}</p>
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>{children}</div>;
}

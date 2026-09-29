import Link from "next/link";
import type { ReactNode } from "react";
import { addDays, addMonths, addWeeks, differenceInCalendarDays, format } from "date-fns";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";
import { cn } from "cn";

type Milestone = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
};

export type GanttProject = {
  id: string;
  name: string;
  code: string;
  status: string;
  start_date: string | null;
  expected_end_date: string | null;
  milestones: Milestone[];
};

function parseDay(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function collectDates(projects: GanttProject[]) {
  const dates: Date[] = [];
  for (const p of projects) {
    for (const raw of [p.start_date, p.expected_end_date, ...p.milestones.flatMap((m) => [m.start_date, m.end_date])]) {
      if (raw) dates.push(parseDay(raw));
    }
  }
  return dates;
}

function pct(day: Date, start: Date, end: Date) {
  const span = end.getTime() - start.getTime();
  if (span <= 0) return 0;
  return Math.min(100, Math.max(0, ((day.getTime() - start.getTime()) / span) * 100));
}

function barTone(status: string) {
  switch (status) {
    case "completed":
      return "bg-success/80";
    case "in_progress":
    case "active":
      return "bg-primary";
    case "cancelled":
      return "bg-muted-foreground/30";
    default:
      return "bg-brand/70";
  }
}

export function ProjectGantt({ projects }: { projects: GanttProject[] }) {
  if (!projects.length) {
    return <EmptyState title="No projects found" description="Try clearing filters, or create a project first." />;
  }

  const dates = collectDates(projects);
  if (!dates.length) {
    return (
      <EmptyState
        title="No dates to plot"
        description="Add start and end dates on project milestones, then open Gantt again."
      />
    );
  }

  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));
  const start = addDays(min, -7);
  const end = addDays(max.getTime() === min.getTime() ? addDays(max, 30) : max, 7);
  const spanDays = Math.max(1, differenceInCalendarDays(end, start));

  const ticks: { at: Date; label: string }[] = [];
  if (spanDays > 400) {
    for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end; d = addMonths(d, 3)) {
      if (d >= start) ticks.push({ at: d, label: format(d, "MMM yyyy") });
    }
  } else if (spanDays > 90) {
    for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end; d = addMonths(d, 1)) {
      if (d >= start) ticks.push({ at: d, label: format(d, "MMM yyyy") });
    }
  } else {
    let d = start;
    while (d <= end) {
      ticks.push({ at: d, label: format(d, "d MMM") });
      d = addWeeks(d, 1);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const showToday = today >= start && today <= end;
  const todayLeft = pct(today, start, end);
  const chartMinWidth = Math.max(ticks.length * 80, 640);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="min-w-full" style={{ minWidth: chartMinWidth }}>
        <div className="grid grid-cols-[minmax(12rem,16rem)_1fr] border-b bg-muted/40 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          <div className="sticky left-0 z-20 border-r bg-muted/40 px-3 py-2">Project / milestone</div>
          <div className="relative h-8">
            {ticks.map((t) => (
              <span
                key={t.at.toISOString()}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
                style={{ left: `${pct(t.at, start, end)}%` }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>

        {projects.map((project) => {
          const rows: { key: string; label: ReactNode; href: string; start: string | null; end: string | null; status: string; isProject?: boolean }[] = [
            {
              key: project.id,
              label: (
                <div className="min-w-0">
                  <Link href={`/projects/${project.id}`} className="block truncate font-medium hover:underline">
                    {project.name}
                  </Link>
                  <p className="truncate text-[11px] text-muted-foreground">{project.code}</p>
                </div>
              ),
              href: `/projects/${project.id}`,
              start: project.start_date,
              end: project.expected_end_date,
              status: project.status,
              isProject: true,
            },
            ...project.milestones.map((m) => ({
              key: m.id,
              label: <span className="block truncate pl-3 text-muted-foreground">{m.name}</span>,
              href: `/projects/${project.id}`,
              start: m.start_date,
              end: m.end_date,
              status: m.status,
            })),
          ];

          return (
            <div key={project.id} className="border-b last:border-b-0">
              {rows.map((row) => {
                const hasStart = Boolean(row.start);
                const hasEnd = Boolean(row.end);
                const barStart = row.start ? parseDay(row.start) : row.end ? parseDay(row.end) : null;
                const barEnd = row.end ? parseDay(row.end) : row.start ? parseDay(row.start) : null;
                const left = barStart ? pct(barStart, start, end) : 0;
                const right = barEnd ? pct(addDays(barEnd, 1), start, end) : left;
                const width = Math.max(right - left, 0.9);

                return (
                  <div
                    key={row.key}
                    className={cn(
                      "grid grid-cols-[minmax(12rem,16rem)_1fr] items-center",
                      row.isProject ? "bg-card" : "bg-card/60",
                    )}
                  >
                    <div className="sticky left-0 z-10 flex h-9 items-center gap-2 border-r bg-card px-3 text-sm">
                      {row.label}
                    </div>
                    <div className="relative h-9 border-l-0">
                      {ticks.map((t) => (
                        <span
                          key={`${row.key}-${t.at.toISOString()}`}
                          className="absolute inset-y-0 w-px bg-border/70"
                          style={{ left: `${pct(t.at, start, end)}%` }}
                        />
                      ))}
                      {showToday ? (
                        <span className="absolute inset-y-0 z-10 w-px bg-destructive/70" style={{ left: `${todayLeft}%` }} />
                      ) : null}
                      {barStart ? (
                        <Link
                          href={row.href}
                          title={`${row.isProject ? project.name : project.milestones.find((m) => m.id === row.key)?.name ?? ""} · ${formatDate(row.start)} → ${formatDate(row.end)}`}
                          className={cn(
                            "absolute top-1/2 z-20 h-4 -translate-y-1/2 rounded-sm hover:opacity-90",
                            barTone(row.status),
                            !hasStart || !hasEnd ? "!w-2 min-w-2" : "",
                          )}
                          style={{ left: `${left}%`, width: hasStart && hasEnd ? `${width}%` : undefined }}
                        />
                      ) : (
                        <span className="sr-only">No dates</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t px-3 py-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-brand/70" /> Planned
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-primary" /> In progress
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-success/80" /> Completed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-px bg-destructive/70" /> Today
        </span>
        <span className="ml-auto hidden sm:inline">
          {projects.length} project{projects.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

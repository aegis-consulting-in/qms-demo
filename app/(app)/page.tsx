import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangleIcon,
  BriefcaseIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  GraduationCapIcon,
  ShieldIcon,
  TruckIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import { BarChart, ChartCard, DonutChart, HBarList, Legend } from "@/components/dashboard/charts";
import { FolderCard } from "@/components/layout/folder-card";
import { StatCard, StatGrid } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { loadDashboard } from "@/lib/data/dashboard";
import { formatBytes } from "@/lib/documents/storage";
import { formatDate, isOverdue } from "@/lib/format";
import { FOLDERS, MODULES } from "@/lib/navigation";

export const metadata: Metadata = { title: "Dashboard" };

function EmptyChart({ message = "No records in this view yet." }: { message?: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>;
}

export default async function HomePage() {
  const user = await requireUser();
  const data = await loadDashboard(user);

  const canSeeDocs = user.can(PERMISSIONS.documents.view);
  const showProjects = user.can(PERMISSIONS.project.view) || (data.projectStats?.total ?? 0) > 0;
  const showAudits = user.can(PERMISSIONS.audit.view) || (data.auditStats?.total ?? 0) > 0;

  const modules = MODULES.filter((m) => m.permissions.length === 0 || user.canAny(m.permissions));
  const myAssignments = data.myAssignments ?? [];
  const attention = myAssignments.filter(
    (a) => a.status === "overdue" || (a.status !== "completed" && a.status !== "cancelled" && isOverdue(a.due_date)),
  );
  const upcoming = myAssignments.filter((a) => a.status === "assigned" || a.status === "in_progress").slice(0, 5);

  const kpis = [
    data.trainingStats
      ? {
          key: "train-overdue",
          label: "Overdue trainings",
          value: data.trainingStats.overdue,
          hint: `${data.trainingStats.assignments} assignments`,
          icon: GraduationCapIcon,
          tone: data.trainingStats.overdue ? ("danger" as const) : ("default" as const),
        }
      : data.myAssignments
        ? {
            key: "my-overdue",
            label: "My overdue",
            value: attention.length,
            hint: `${myAssignments.length} assigned to you`,
            icon: GraduationCapIcon,
            tone: attention.length ? ("danger" as const) : ("default" as const),
          }
        : null,
    data.employeeStats
      ? {
          key: "people",
          label: "Employees",
          value: data.employeeStats.active,
          hint: `${data.employeeStats.total} total`,
          icon: UsersIcon,
          tone: "default" as const,
        }
      : null,
    data.maintenanceStats
      ? {
          key: "maint",
          label: "Maintenance overdue",
          value: data.maintenanceStats.overdue,
          hint: `${data.maintenanceStats.open} open jobs`,
          icon: WrenchIcon,
          tone: data.maintenanceStats.overdue ? ("danger" as const) : ("default" as const),
        }
      : null,
    data.supplierStats
      ? {
          key: "sup",
          label: "Reviews due",
          value: data.supplierStats.reviewDue,
          hint: `${data.supplierStats.pendingEvaluation} unevaluated`,
          icon: TruckIcon,
          tone: data.supplierStats.reviewDue ? ("warning" as const) : ("default" as const),
        }
      : null,
    showProjects && data.projectStats
      ? {
          key: "proj",
          label: "Active projects",
          value: data.projectStats.active,
          hint: `${data.projectStats.total} in your view`,
          icon: BriefcaseIcon,
          tone: "default" as const,
        }
      : null,
    showAudits && data.auditStats
      ? {
          key: "aud",
          label: "Open findings",
          value: data.auditStats.openFindings,
          hint: `${data.auditStats.openActions} corrective actions`,
          icon: ClipboardCheckIcon,
          tone: data.auditStats.openFindings ? ("warning" as const) : ("default" as const),
        }
      : null,
    data.documentStats
      ? {
          key: "docs",
          label: "Documents",
          value: data.documentStats.total,
          hint: formatBytes(data.documentStats.bytes),
          icon: FileTextIcon,
          tone: "default" as const,
        }
      : null,
    data.adminStats
      ? {
          key: "users",
          label: "Users",
          value: data.adminStats.activeUsers,
          hint: `${data.adminStats.users} accounts`,
          icon: ShieldIcon,
          tone: "default" as const,
        }
      : null,
  ].filter((k): k is NonNullable<typeof k> => Boolean(k));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Dashboard</p>
        <h1 className="font-heading mt-1 text-xl font-semibold tracking-tight">{user.profile.full_name ?? user.email}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {[user.employee?.employee_code, user.roles.map((r) => r.name).join(", ")].filter(Boolean).join(" · ")}
        </p>
      </div>

      {kpis.length ? (
        <StatGrid className={kpis.length < 4 ? "lg:grid-cols-3" : undefined}>
          {kpis.slice(0, 8).map((k) => (
            <StatCard key={k.key} label={k.label} value={k.value} icon={k.icon} hint={k.hint} tone={k.tone} />
          ))}
        </StatGrid>
      ) : null}

      {attention.length ? (
        <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangleIcon className="size-4" />
            {attention.length} overdue training{attention.length === 1 ? "" : "s"} assigned to you
          </p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {attention.slice(0, 4).map((a) => (
              <li key={a.id} className="text-sm">
                <Link href={`/training/${a.training_id}`} className="font-medium hover:underline">
                  {a.training?.name ?? "Training"}
                </Link>
                <span className="text-muted-foreground"> · due {formatDate(a.due_date)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {data.assignmentSlices ? (
          <ChartCard title="Training assignments" href="/training">
            {data.assignmentSlices.some((s) => s.value) ? (
              <div className="flex items-center gap-6">
                <DonutChart items={data.assignmentSlices} />
                <Legend items={data.assignmentSlices} />
              </div>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>
        ) : data.mySlices ? (
          <ChartCard title="My training status" href="/training/my">
            {data.mySlices.some((s) => s.value) ? (
              <div className="flex items-center gap-6">
                <DonutChart items={data.mySlices} />
                <Legend items={data.mySlices} />
              </div>
            ) : (
              <EmptyChart message="You have no training assignments." />
            )}
          </ChartCard>
        ) : null}

        {data.maintenanceSlices ? (
          <ChartCard title="Maintenance jobs" href="/maintenance">
            {data.maintenanceSlices.some((s) => s.value) ? <BarChart items={data.maintenanceSlices} /> : <EmptyChart />}
          </ChartCard>
        ) : null}

        {showProjects && data.projectSlices ? (
          <ChartCard title="Projects" href="/projects">
            {data.projectSlices.some((s) => s.value) ? (
              <div className="flex items-center gap-6">
                <DonutChart items={data.projectSlices} />
                <Legend items={data.projectSlices} />
              </div>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>
        ) : null}

        {data.supplierSlices ? (
          <ChartCard title="Suppliers" href="/suppliers">
            {data.supplierSlices.some((s) => s.value) ? <BarChart items={data.supplierSlices} /> : <EmptyChart />}
          </ChartCard>
        ) : null}

        {showAudits && data.auditSlices ? (
          <ChartCard title="Audits" href="/audits">
            {data.auditSlices.some((s) => s.value) ? (
              <div className="flex items-center gap-6">
                <DonutChart items={data.auditSlices} />
                <Legend items={data.auditSlices} />
              </div>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>
        ) : null}

        {data.documentSlices ? (
          <ChartCard title="Documents by module" href="/documents">
            {data.documentSlices.length ? <HBarList items={data.documentSlices} /> : <EmptyChart message="No files uploaded yet." />}
          </ChartCard>
        ) : null}

        {user.employee ? (
          <ChartCard title="My trainings" href="/training/my" className={data.documentSlices && showAudits ? "lg:col-span-1" : undefined}>
            {upcoming.length ? (
              <ul className="divide-y">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link href={`/training/${a.training_id}`} className="block truncate text-sm font-medium hover:underline">
                        {a.training?.name ?? "Training"}
                      </Link>
                      <span className="text-xs text-muted-foreground">Due {formatDate(a.due_date)}</span>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyChart message="No open assignments." />
            )}
          </ChartCard>
        ) : null}
      </div>

      {canSeeDocs ? (
        <section className="rounded-lg border bg-card px-1 py-0.5 sm:px-2" aria-label="Document folders">
          <div className="grid grid-cols-2 sm:grid-cols-4 sm:divide-x">
            {FOLDERS.filter((f) => f.home).map((f) => (
              <FolderCard key={f.key} label={f.label} href={f.href} count={data.documentStats?.byModule[f.key]?.count ?? 0} />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-label="Modules">
        <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Modules</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.key}
                href={m.href as never}
                className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm font-medium hover:border-brand/35 hover:bg-muted/40"
              >
                <Icon className="size-4 shrink-0 text-brand" />
                <span className="truncate">{m.label.replace(" Management", "").replace(" Process", "").replace(" Settings", "")}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

"use client";

import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  FolderKanban,
  GraduationCap,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { navItems } from "@/lib/navigation";
import { useQms, useSession } from "@/lib/store";
import { daysUntil, dueLabel, formatDate, percent } from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, ProgressBar, StatTile } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";

export default function DashboardPage() {
  const { state } = useQms();
  const { role, currentUser } = useSession();

  const activeEmployees = state.employees.filter((employee) => employee.status === "Active");
  const pendingApprovals = state.assignments.filter(
    (assignment) => assignment.status === "Waiting for Approval",
  );
  const overdueTraining = state.assignments.filter(
    (assignment) =>
      !["Approved"].includes(assignment.status) && daysUntil(assignment.dueDate) < 0,
  );
  const approvedTraining = state.assignments.filter((assignment) => assignment.status === "Approved");
  const activeAssets = state.assets.filter((asset) => asset.status === "Active");
  const ppmAttention = activeAssets.filter((asset) => daysUntil(asset.dueDate) <= 14);
  const activeSuppliers = state.suppliers.filter((supplier) => supplier.status === "Active");
  const supplierDue = activeSuppliers.filter((supplier) => daysUntil(supplier.dueDate) <= 30);
  const activeProjects = state.projects.filter((project) => project.status === "Active");
  const openTasks = state.tasks.filter((task) => task.status !== "Completed");
  const activeAudits = state.audits.filter((audit) => audit.status === "Active");
  const openFindings = state.subProcesses.flatMap((subProcess) =>
    subProcess.clauseChecks.filter((check) => check.verdict === "Minor NC" || check.verdict === "Major NC"),
  );

  const trainingCompliance = percent(approvedTraining.length, state.assignments.length);

  const attention = [
    ...overdueTraining.map((assignment) => {
      const course = state.courses.find((item) => item.id === assignment.courseId);
      const employee = state.employees.find((item) => item.id === assignment.employeeId);
      return {
        id: `training-${assignment.id}`,
        module: "Training" as const,
        href: "/training" as const,
        title: course?.title ?? "Training",
        detail: `${employee?.name ?? "Unassigned"} · ${assignment.status}`,
        dueDate: assignment.dueDate,
      };
    }),
    ...ppmAttention.map((asset) => ({
      id: `asset-${asset.id}`,
      module: "PPM" as const,
      href: "/maintenance" as const,
      title: asset.name,
      detail: `${asset.serialNumber} · ${asset.maintenanceState}`,
      dueDate: asset.dueDate,
    })),
    ...supplierDue.map((supplier) => ({
      id: `supplier-${supplier.id}`,
      module: "Supplier" as const,
      href: "/suppliers" as const,
      title: supplier.name,
      detail: `${supplier.department} · re-qualification`,
      dueDate: supplier.dueDate,
    })),
    ...activeAudits
      .filter((audit) => daysUntil(audit.auditDate) <= 14)
      .map((audit) => ({
        id: `audit-${audit.id}`,
        module: "Audit" as const,
        href: "/audits" as const,
        title: audit.processName,
        detail: `Auditors: ${audit.auditors.join(", ")}`,
        dueDate: audit.auditDate,
      })),
  ].sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));

  const enabledReminders = state.reminders.filter((reminder) => reminder.enabled);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${currentUser?.name?.split(" ")[0] ?? "there"}`}
        description={`You are working as ${role}. Every record below is stored locally in this browser.`}
        actions={
          <Badge tone="violet" dot>
            Local-only demo data
          </Badge>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Active employees"
          value={activeEmployees.length}
          hint={`${state.employees.length - activeEmployees.length} inactive`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatTile
          label="Awaiting approval"
          value={pendingApprovals.length}
          hint="Training submissions in the review queue"
          tone="amber"
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatTile
          label="PPM attention"
          value={ppmAttention.length}
          hint="Assets due within 14 days or overdue"
          tone="rose"
          icon={<Wrench className="h-5 w-5" />}
        />
        <StatTile
          label="Open audit findings"
          value={openFindings.length}
          hint={`${activeAudits.length} active audit processes`}
          tone="sky"
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Attention required"
            description="Due or overdue items pulled from every module"
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          {attention.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="Everything is on track"
              message="No overdue training, maintenance, supplier or audit deadlines."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {attention.slice(0, 8).map((item) => {
                const days = daysUntil(item.dueDate);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 sm:px-5"
                    >
                      <Badge tone={days < 0 ? "rose" : "amber"} dot>
                        {item.module}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                        <p className="truncate text-xs text-slate-500">{item.detail}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-semibold text-slate-700">{dueLabel(item.dueDate)}</p>
                        <p className="text-[11px] text-slate-400">{formatDate(item.dueDate)}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Training compliance"
              description="Share of assignments fully approved"
              icon={<GraduationCap className="h-4 w-4" />}
            />
            <CardBody className="space-y-3">
              <div className="flex items-end justify-between">
                <p className="text-3xl font-semibold text-slate-900">{trainingCompliance}%</p>
                <p className="text-xs text-slate-500">
                  {approvedTraining.length} of {state.assignments.length} assignments
                </p>
              </div>
              <ProgressBar
                value={trainingCompliance}
                tone={trainingCompliance >= 80 ? "emerald" : trainingCompliance >= 50 ? "amber" : "rose"}
              />
              <dl className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="text-slate-500">In progress</dt>
                  <dd className="text-sm font-semibold text-slate-900">
                    {state.assignments.filter((item) => item.status === "In Progress").length}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="text-slate-500">Overdue</dt>
                  <dd className="text-sm font-semibold text-slate-900">{overdueTraining.length}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Active reminder rules"
              description={`${enabledReminders.length} of ${state.reminders.length} enabled`}
              icon={<BellRing className="h-4 w-4" />}
            />
            <ul className="divide-y divide-slate-100">
              {enabledReminders.slice(0, 4).map((reminder) => (
                <li key={reminder.id} className="flex items-center gap-2 px-4 py-2.5 sm:px-5">
                  <Badge tone="indigo">{reminder.module}</Badge>
                  <p className="min-w-0 flex-1 truncate text-xs text-slate-600">{reminder.event}</p>
                  <span className="shrink-0 text-xs font-semibold text-slate-700">
                    {reminder.leadDays}d before
                  </span>
                </li>
              ))}
            </ul>
            <CardBody className="border-t border-slate-100 pt-3">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Configure reminders
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Project delivery"
            description={`${activeProjects.length} active projects · ${openTasks.length} open tasks`}
            icon={<FolderKanban className="h-4 w-4" />}
          />
          <ul className="divide-y divide-slate-100">
            {activeProjects.map((project) => {
              const phases = state.phases.filter((phase) => phase.projectId === project.id);
              const milestones = state.milestones.filter((milestone) =>
                phases.some((phase) => phase.id === milestone.phaseId),
              );
              const done = milestones.filter((milestone) => milestone.completed).length;
              const progress = percent(done, milestones.length);
              return (
                <li key={project.id} className="px-4 py-3 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{project.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {project.code} · {phases.length} phases · {milestones.length} milestones
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-slate-700">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} className="mt-2" />
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Supplier register"
            description={`${activeSuppliers.length} active vendors`}
            icon={<Truck className="h-4 w-4" />}
          />
          <ul className="divide-y divide-slate-100">
            {state.suppliers.slice(0, 5).map((supplier) => (
              <li key={supplier.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{supplier.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {supplier.department} · {supplier.serviceSupplied ? "Service" : "Goods"}
                  </p>
                </div>
                <span className="hidden text-xs text-slate-500 sm:block">{dueLabel(supplier.dueDate)}</span>
                <StatusBadge status={supplier.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {navItems
          .filter((item) => item.href !== "/" && (!item.roles || item.roles.includes(role)))
          .map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="card-surface group flex items-start gap-3 p-4 transition-shadow hover:shadow-md"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    {item.label}
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">{item.description}</span>
                </span>
              </Link>
            );
          })}
      </div>
    </>
  );
}

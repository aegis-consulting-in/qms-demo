import type { Metadata } from "next";
import { AlertTriangleIcon, BookOpenIcon, CheckCircle2Icon, ClockIcon } from "lucide-react";
import { PageHeader, Section } from "@/components/shared/page-header";
import { StatCard, StatGrid } from "@/components/shared/stat-card";
import { AssignmentsTable } from "@/components/training/assignments-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireUser } from "@/lib/auth/guards";
import { getMyAssignments } from "@/lib/data/training";
import { isOverdue } from "@/lib/format";

export const metadata: Metadata = { title: "My Trainings" };

export default async function MyTrainingsPage() {
  const user = await requireUser();

  if (!user.employee) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="My Trainings" crumbs={[{ label: "HR", href: "/training" }, { label: "My Trainings" }]} />
        <Alert>
          <AlertTitle>No employee record linked</AlertTitle>
          <AlertDescription>Your login isn&apos;t linked to an employee yet, so no trainings can be assigned to you. Ask an administrator to link your account.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const assignments = await getMyAssignments(user.employee.id);
  const open = assignments.filter((a) => a.status === "assigned" || a.status === "in_progress" || a.status === "overdue");
  const overdue = open.filter((a) => a.status === "overdue" || isOverdue(a.due_date));
  const done = assignments.filter((a) => a.status === "completed");
  const history = assignments.filter((a) => a.status === "completed" || a.status === "cancelled");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="My Trainings" description="Trainings assigned to you. Update your progress as you go." crumbs={[{ label: "HR", href: "/training" }, { label: "My Trainings" }]} />

      <StatGrid>
        <StatCard label="Open" value={open.length} icon={BookOpenIcon} />
        <StatCard label="In progress" value={open.filter((a) => a.status === "in_progress").length} icon={ClockIcon} />
        <StatCard label="Overdue" value={overdue.length} icon={AlertTriangleIcon} tone={overdue.length ? "danger" : "default"} />
        <StatCard label="Completed" value={done.length} icon={CheckCircle2Icon} tone="success" />
      </StatGrid>

      <Section title="Open trainings">
        <AssignmentsTable rows={open} show="training" mode="self" emptyTitle="You're all caught up" emptyDescription="No open trainings right now." />
      </Section>

      <Section title="History">
        <AssignmentsTable rows={history} show="training" emptyTitle="No completed trainings yet" />
      </Section>
    </div>
  );
}

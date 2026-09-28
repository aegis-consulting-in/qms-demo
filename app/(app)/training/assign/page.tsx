import type { Metadata } from "next";
import { AssignTrainingForm } from "@/components/training/assign-training-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getDepartments, getEmployeeOptions } from "@/lib/data/master";
import { listTrainings } from "@/lib/data/training";

export const metadata: Metadata = { title: "Create Employee Training" };

/**
 * "Create Employee Training": assign a catalogue training to one or more
 * employees. The employee picker only contains people the caller may see
 * (RLS), so a manager can only assign within their team.
 */
export default async function AssignTrainingPage() {
  const user = await requirePagePermission(PERMISSIONS.training.assign, PERMISSIONS.training.team);
  const [{ rows: trainings }, employees, departments] = await Promise.all([
    listTrainings({ page: 1, pageSize: 100, q: "", dir: "asc" }),
    getEmployeeOptions(),
    getDepartments(),
  ]);

  const pickable = employees.filter((e) => e.id !== user.employee?.id || user.can(PERMISSIONS.training.assign));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Create Employee Training"
        description="Assign a training from the catalogue to employees and set a due date."
        crumbs={[{ label: "Training", href: "/training" }, { label: "Assign" }]}
      />
      <Section>
        {trainings.length ? (
          <AssignTrainingForm trainings={trainings} employees={pickable} departments={departments} />
        ) : (
          <EmptyState title="No trainings in the catalogue" description="Create a training first, then come back to assign it." />
        )}
      </Section>
    </div>
  );
}

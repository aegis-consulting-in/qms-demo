import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { TrainingConfigList } from "@/components/admin/training-config";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getTrainingLevels, getTrainingStatuses } from "@/lib/data/master";

export const metadata: Metadata = { title: "Training configuration" };

export default async function AdminTrainingConfigPage() {
  const user = await requirePagePermission(PERMISSIONS.admin.settings);
  const [levels, statuses] = await Promise.all([getTrainingLevels(true), getTrainingStatuses(true)]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Training Configuration"
        description="Levels and statuses used when creating trainings."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Training configuration" }]}
      />
      <AdminNav can={(k) => user.can(k)} current="training-config" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Training levels">
          <TrainingConfigList table="training_levels" items={levels} />
        </Section>
        <Section title="Training statuses">
          <TrainingConfigList table="training_statuses" items={statuses} />
        </Section>
      </div>
    </div>
  );
}

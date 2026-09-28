import type { Metadata } from "next";
import { TrainingForm } from "@/components/training/training-form";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getTrainingLevels, getTrainingStatuses } from "@/lib/data/master";

export const metadata: Metadata = { title: "Create New Training" };

export default async function NewTrainingPage() {
  await requirePagePermission(PERMISSIONS.training.create);
  const [levels, statuses] = await Promise.all([getTrainingLevels(), getTrainingStatuses()]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Create New Training" crumbs={[{ label: "Training", href: "/training" }, { label: "New" }]} />
      <Section>
        <TrainingForm levels={levels} statuses={statuses} />
      </Section>
    </div>
  );
}

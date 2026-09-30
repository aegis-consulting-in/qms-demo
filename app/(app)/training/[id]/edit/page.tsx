import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrainingForm } from "@/components/training/training-form";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getTrainingLevels, getTrainingStatuses } from "@/lib/data/master";
import { getTraining } from "@/lib/data/training";

export const metadata: Metadata = { title: "Edit training" };

export default async function EditTrainingPage({ params }: PageProps<"/training/[id]/edit">) {
  await requirePagePermission(PERMISSIONS.training.edit);
  const { id } = await params;
  const [training, levels, statuses] = await Promise.all([getTraining(id), getTrainingLevels(), getTrainingStatuses()]);
  if (!training) notFound();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Edit ${training.name}`}
        crumbs={[{ label: "HR", href: "/training" }, { label: training.name, href: `/training/${training.id}` }, { label: "Edit" }]}
      />
      <Section>
        <TrainingForm training={training} levels={levels} statuses={statuses} />
      </Section>
    </div>
  );
}

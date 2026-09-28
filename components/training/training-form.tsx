"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { createTrainingAction, updateTrainingAction } from "@/lib/actions/training";
import { useAction } from "@/lib/hooks/use-action";
import type { TrainingRow } from "@/lib/types/database";
import { trainingSchema } from "@/lib/validation/training";

type Values = z.input<typeof trainingSchema>;
type Option = { id: string; name: string; is_default?: boolean };

export function TrainingForm({ training, levels, statuses }: { training?: TrainingRow; levels: Option[]; statuses: Option[] }) {
  const router = useRouter();
  const isEdit = Boolean(training);
  const defaultStatus = statuses.find((s) => s.is_default)?.id ?? "";

  const form = useForm<Values>({
    resolver: zodResolver(trainingSchema),
    defaultValues: {
      code: training?.code ?? "",
      name: training?.name ?? "",
      description: training?.description ?? "",
      levelId: training?.level_id ?? "",
      statusId: training?.status_id ?? defaultStatus,
      durationHours: training?.duration_hours ?? "",
    },
  });

  const { run, isPending, error, fieldErrors } = useAction(
    async (values: Values) => (isEdit ? updateTrainingAction({ id: training!.id, ...values }) : createTrainingAction(values)),
    {
      successMessage: isEdit ? "Training updated." : "Training created.",
      onSuccess: (data) => router.push(`/training/${data.id}`),
    },
  );
  const err = (k: keyof Values) => form.formState.errors[k]?.message ?? fieldErrors[k];

  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} className="flex flex-col gap-5" noValidate>
      <FormError message={error} />
      <FormGrid>
        <FormField label="Training name" htmlFor="name" required error={err("name")} className="md:col-span-2">
          <Input id="name" placeholder="e.g. ISO 9001:2015 Awareness" {...form.register("name")} />
        </FormField>
        <FormField label="Code" htmlFor="code" error={err("code")} hint="Optional short identifier, e.g. TRN-001">
          <Input id="code" {...form.register("code")} />
        </FormField>
        <FormField label="Duration (hours)" htmlFor="durationHours" error={err("durationHours")}>
          <Input id="durationHours" type="number" step="0.5" min="0" {...form.register("durationHours")} />
        </FormField>
        <FormField label="Level" htmlFor="levelId" error={err("levelId")}>
          <NativeSelect id="levelId" {...form.register("levelId")}>
            <option value="">— Select level —</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Status" htmlFor="statusId" error={err("statusId")}>
          <NativeSelect id="statusId" {...form.register("statusId")}>
            <option value="">— Default —</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </FormGrid>
      <FormField label="Description" htmlFor="description" error={err("description")}>
        <Textarea id="description" rows={5} placeholder="Objectives, audience, prerequisites…" {...form.register("description")} />
      </FormField>
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2Icon className="animate-spin" /> : null}
          {isEdit ? "Save changes" : "Create training"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import type { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FormError, FormField } from "@/components/ui/form-field";
import { ConfirmButton } from "@/components/shared/confirm-dialog";
import { BooleanBadge } from "@/components/shared/status-badge";
import { deleteTrainingConfigAction, upsertTrainingConfigAction } from "@/lib/actions/admin";
import { useAction } from "@/lib/hooks/use-action";
import { trainingConfigItemSchema } from "@/lib/validation/training";

type Values = z.input<typeof trainingConfigItemSchema>;
type Item = { id: string; name: string; sort_order: number; is_active: boolean; is_default?: boolean };
type Table = "training_levels" | "training_statuses";

export function TrainingConfigList({ table, items }: { table: Table; items: Item[] }) {
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(trainingConfigItemSchema),
    defaultValues: { name: "", sortOrder: items.length + 1, isActive: true, isDefault: false },
  });
  const { run, isPending, error, fieldErrors } = useAction((values: Values) => upsertTrainingConfigAction(table, values), {
    successMessage: "Saved.",
    onSuccess: () => {
      form.reset({ name: "", sortOrder: items.length + 2, isActive: true, isDefault: false });
      router.refresh();
    },
  });
  const err = (k: keyof Values) => form.formState.errors[k]?.message ?? fieldErrors[k];

  const remove = async (id: string) => {
    const res = await deleteTrainingConfigAction(table, { id });
    if (res.ok) {
      toast.success("Deleted.");
      router.refresh();
    } else toast.error(res.error);
  };

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y rounded-lg border">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 font-medium">{item.name}</span>
            <span className="text-xs text-muted-foreground">#{item.sort_order}</span>
            {item.is_default ? <BooleanBadge value={true} trueLabel="Default" falseLabel="" /> : null}
            <BooleanBadge value={item.is_active} />
            <ConfirmButton
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              title={`Delete ${item.name}?`}
              description="This fails if trainings still reference it."
              confirmLabel="Delete"
              destructive
              onConfirm={() => remove(item.id)}
            >
              <Trash2Icon />
            </ConfirmButton>
          </li>
        ))}
      </ul>
      <form onSubmit={form.handleSubmit((v) => run(v))} className="flex flex-col gap-3 rounded-lg border p-3" noValidate>
        <FormError message={error} />
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Name" htmlFor={`${table}-name`} required error={err("name")}>
            <Input id={`${table}-name`} {...form.register("name")} />
          </FormField>
          <FormField label="Sort order" htmlFor={`${table}-sort`} error={err("sortOrder")}>
            <Input id={`${table}-sort`} type="number" {...form.register("sortOrder")} />
          </FormField>
          <div className="flex flex-col justify-end gap-2 pb-1">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.watch("isActive") as boolean} onCheckedChange={(c) => form.setValue("isActive", Boolean(c))} />
              Active
            </label>
            {table === "training_statuses" ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={Boolean(form.watch("isDefault"))} onCheckedChange={(c) => form.setValue("isDefault", Boolean(c))} />
                Default for new trainings
              </label>
            ) : null}
          </div>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />} Add
        </Button>
      </form>
    </div>
  );
}

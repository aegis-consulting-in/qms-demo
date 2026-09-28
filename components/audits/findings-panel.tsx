"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import type { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { ConfirmButton } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { createFindingAction, deleteFindingAction } from "@/lib/actions/audits";
import { useAction } from "@/lib/hooks/use-action";
import { humanize } from "@/lib/format";
import type { AuditFindingRow } from "@/lib/types/database";
import { FINDING_SEVERITIES, FINDING_STATUSES, findingSchema } from "@/lib/validation/audits";

type Values = z.input<typeof findingSchema>;

export function FindingsPanel({
  auditId,
  findings,
  canEdit,
}: {
  auditId: string;
  findings: AuditFindingRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(findingSchema),
    defaultValues: { auditId, title: "", description: "", clause: "", severity: "minor", status: "open" },
  });
  const { run, isPending, error, fieldErrors } = useAction(createFindingAction, {
    successMessage: "Finding recorded.",
    onSuccess: () => {
      form.reset({ auditId, title: "", description: "", clause: "", severity: "minor", status: "open" });
      setOpen(false);
      router.refresh();
    },
  });
  const err = (k: keyof Values) => form.formState.errors[k]?.message ?? fieldErrors[k];

  const remove = async (id: string) => {
    const res = await deleteFindingAction({ id, auditId });
    if (res.ok) {
      toast.success("Finding removed.");
      router.refresh();
    } else toast.error(res.error);
  };

  return (
    <div className="flex flex-col gap-3">
      {findings.length ? (
        <ul className="divide-y rounded-lg border">
          {findings.map((f) => (
            <li key={f.id} className="flex items-start gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{f.title}</p>
                <p className="text-xs text-muted-foreground">
                  {f.clause ? `${f.clause} · ` : ""}
                  {humanize(f.severity)}
                </p>
                {f.description ? <p className="mt-1 text-sm whitespace-pre-line">{f.description}</p> : null}
              </div>
              <StatusBadge status={f.status} />
              {canEdit ? (
                <ConfirmButton
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  title="Delete this finding?"
                  description="Corrective actions linked to it will lose the finding reference."
                  confirmLabel="Delete"
                  destructive
                  onConfirm={() => remove(f.id)}
                >
                  <Trash2Icon />
                </ConfirmButton>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No findings yet" description="Record non-conformities and observations as the audit progresses." className="py-8" />
      )}

      {canEdit && !open ? (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <PlusIcon /> Add finding
        </Button>
      ) : null}

      {canEdit && open ? (
        <form onSubmit={form.handleSubmit((v) => run(v))} className="flex flex-col gap-3 rounded-lg border p-3" noValidate>
          <FormError message={error} />
          <FormField label="Title" htmlFor="finding-title" required error={err("title")}>
            <Input id="finding-title" {...form.register("title")} />
          </FormField>
          <FormGrid>
            <FormField label="Clause" htmlFor="finding-clause" error={err("clause")}>
              <Input id="finding-clause" {...form.register("clause")} />
            </FormField>
            <FormField label="Severity" htmlFor="finding-severity" error={err("severity")}>
              <NativeSelect id="finding-severity" {...form.register("severity")}>
                {FINDING_SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Status" htmlFor="finding-status" error={err("status")}>
              <NativeSelect id="finding-status" {...form.register("status")}>
                {FINDING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </FormGrid>
          <FormField label="Description" htmlFor="finding-description" error={err("description")}>
            <Textarea id="finding-description" rows={2} {...form.register("description")} />
          </FormField>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2Icon className="animate-spin" /> : null} Save finding
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

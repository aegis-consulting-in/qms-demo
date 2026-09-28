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
import { createCorrectiveActionAction, deleteCorrectiveActionAction } from "@/lib/actions/audits";
import { useAction } from "@/lib/hooks/use-action";
import { formatDate, fullName, humanize, isOverdue } from "@/lib/format";
import type { AuditFindingRow, CorrectiveActionRow } from "@/lib/types/database";
import { CORRECTIVE_ACTION_STATUSES, correctiveActionSchema } from "@/lib/validation/audits";

type Values = z.input<typeof correctiveActionSchema>;
type ActionRow = CorrectiveActionRow & {
  owner: { id: string; first_name: string; last_name: string } | null;
  finding: { id: string; title: string } | null;
};

export function CorrectiveActionsPanel({
  auditId,
  actions,
  findings,
  employees,
  canEdit,
}: {
  auditId: string;
  actions: ActionRow[];
  findings: AuditFindingRow[];
  employees: { id: string; first_name: string; last_name: string; employee_code: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(correctiveActionSchema),
    defaultValues: { auditId, findingId: "", description: "", ownerId: "", dueDate: "", completedDate: "", status: "open" },
  });
  const { run, isPending, error, fieldErrors } = useAction(createCorrectiveActionAction, {
    successMessage: "Corrective action added.",
    onSuccess: () => {
      form.reset({ auditId, findingId: "", description: "", ownerId: "", dueDate: "", completedDate: "", status: "open" });
      setOpen(false);
      router.refresh();
    },
  });
  const err = (k: keyof Values) => form.formState.errors[k]?.message ?? fieldErrors[k];

  const remove = async (id: string) => {
    const res = await deleteCorrectiveActionAction({ id, auditId });
    if (res.ok) {
      toast.success("Corrective action removed.");
      router.refresh();
    } else toast.error(res.error);
  };

  return (
    <div className="flex flex-col gap-3">
      {actions.length ? (
        <ul className="divide-y rounded-lg border">
          {actions.map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm">{a.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.finding ? `${a.finding.title} · ` : ""}
                  Owner: {fullName(a.owner)}
                  {a.due_date ? ` · Due ${formatDate(a.due_date)}` : ""}
                </p>
              </div>
              <span className={isOverdue(a.due_date) && a.status !== "completed" && a.status !== "verified" && a.status !== "cancelled" ? "font-medium" : undefined}>
                <StatusBadge status={a.status} />
              </span>
              {canEdit ? (
                <ConfirmButton
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  title="Delete this corrective action?"
                  confirmLabel="Delete"
                  destructive
                  onConfirm={() => remove(a.id)}
                >
                  <Trash2Icon />
                </ConfirmButton>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No corrective actions" description="Track CAPA items against findings." className="py-8" />
      )}

      {canEdit && !open ? (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <PlusIcon /> Add action
        </Button>
      ) : null}

      {canEdit && open ? (
        <form onSubmit={form.handleSubmit((v) => run(v))} className="flex flex-col gap-3 rounded-lg border p-3" noValidate>
          <FormError message={error} />
          <FormField label="Description" htmlFor="ca-description" required error={err("description")}>
            <Textarea id="ca-description" rows={2} {...form.register("description")} />
          </FormField>
          <FormGrid>
            <FormField label="Linked finding" htmlFor="ca-finding" error={err("findingId")}>
              <NativeSelect id="ca-finding" {...form.register("findingId")}>
                <option value="">— None —</option>
                {findings.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Owner" htmlFor="ca-owner" error={err("ownerId")}>
              <NativeSelect id="ca-owner" {...form.register("ownerId")}>
                <option value="">— Unassigned —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.first_name} {e.last_name} ({e.employee_code})
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Due date" htmlFor="ca-due" error={err("dueDate")}>
              <Input id="ca-due" type="date" {...form.register("dueDate")} />
            </FormField>
            <FormField label="Status" htmlFor="ca-status" error={err("status")}>
              <NativeSelect id="ca-status" {...form.register("status")}>
                {CORRECTIVE_ACTION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </FormGrid>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2Icon className="animate-spin" /> : null} Save action
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

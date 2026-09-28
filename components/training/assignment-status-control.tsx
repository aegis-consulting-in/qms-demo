"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/shared/confirm-dialog";
import { deleteAssignmentAction, updateAssignmentStatusAction } from "@/lib/actions/training";
import { humanize } from "@/lib/format";
import { ASSIGNMENT_STATUSES } from "@/lib/validation/training";
import type { AssignmentStatus } from "@/lib/types/database";

/**
 * Inline status editor for a training assignment.
 * - `mode="self"`: the employee progressing their own training (no cancel).
 * - `mode="manage"`: manager/assigner controls incl. cancel and delete.
 */
export function AssignmentStatusControl({
  id,
  status,
  mode,
  canDelete = false,
}: {
  id: string;
  status: AssignmentStatus;
  mode: "self" | "manage";
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const options = ASSIGNMENT_STATUSES.filter((s) => {
    if (mode === "self") return s === "assigned" || s === "in_progress" || s === "completed";
    return true;
  });

  const change = async (next: AssignmentStatus) => {
    if (next === status) return;
    setBusy(true);
    const res = await updateAssignmentStatusAction({ id, status: next });
    setBusy(false);
    if (res.ok) {
      toast.success(`Marked as ${humanize(next).toLowerCase()}.`);
      router.refresh();
    } else toast.error(res.error);
  };

  const remove = async () => {
    const res = await deleteAssignmentAction({ id });
    if (res.ok) {
      toast.success("Assignment removed.");
      router.refresh();
    } else toast.error(res.error);
  };

  const locked = mode === "self" && (status === "cancelled" || status === "completed");

  return (
    <div className="flex items-center gap-1">
      <NativeSelect
        value={status}
        disabled={busy || locked}
        onChange={(e) => change(e.target.value as AssignmentStatus)}
        className="h-7 w-auto min-w-32 text-xs"
        aria-label="Assignment status"
      >
        {!options.includes(status) ? <option value={status}>{humanize(status)}</option> : null}
        {options.map((s) => (
          <option key={s} value={s}>
            {humanize(s)}
          </option>
        ))}
      </NativeSelect>
      {busy ? <Loader2Icon className="size-4 animate-spin text-muted-foreground" /> : null}
      {mode === "manage" && canDelete ? (
        <ConfirmButton
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          title="Remove this assignment?"
          description="The assignment record will be deleted. Use “Cancelled” instead if you want to keep history."
          confirmLabel="Remove"
          destructive
          onConfirm={remove}
          aria-label="Remove assignment"
        >
          <Trash2Icon />
        </ConfirmButton>
      ) : null}
      {mode === "self" && status === "assigned" ? (
        <Button type="button" size="sm" variant="outline" onClick={() => change("in_progress")} disabled={busy}>
          Start
        </Button>
      ) : null}
    </div>
  );
}

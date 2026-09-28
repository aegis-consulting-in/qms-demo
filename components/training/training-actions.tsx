"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmButton } from "@/components/shared/confirm-dialog";
import { archiveTrainingAction, restoreTrainingAction } from "@/lib/actions/training";
import { AssignTrainingForm, type EmployeeOption } from "./assign-training-form";

export function TrainingActions({
  training,
  canEdit,
  canDelete,
  canAssign,
  employees,
  departments,
  alreadyAssigned,
}: {
  training: { id: string; name: string; code: string | null; deleted_at: string | null };
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
  employees: EmployeeOption[];
  departments: { id: string; name: string }[];
  alreadyAssigned: string[];
}) {
  const router = useRouter();
  const [assignOpen, setAssignOpen] = useState(false);

  const archive = async () => {
    const res = await archiveTrainingAction({ id: training.id });
    if (res.ok) {
      toast.success("Training archived.");
      router.push("/training");
    } else toast.error(res.error);
  };
  const restore = async () => {
    const res = await restoreTrainingAction({ id: training.id });
    if (res.ok) {
      toast.success("Training restored.");
      router.refresh();
    } else toast.error(res.error);
  };

  return (
    <>
      {canAssign && !training.deleted_at ? (
        <Button onClick={() => setAssignOpen(true)}>
          <UserPlusIcon /> Assign
        </Button>
      ) : null}
      {canEdit ? (
        <Button variant="outline" render={<Link href={`/training/${training.id}/edit`} />}>
          <PencilIcon /> Edit
        </Button>
      ) : null}
      {canDelete && !training.deleted_at ? (
        <ConfirmButton
          variant="outline"
          title="Archive this training?"
          description="It will be hidden from the catalogue. Existing assignments and documents are kept, and you can restore it later."
          confirmLabel="Archive"
          onConfirm={archive}
        >
          <ArchiveIcon /> Archive
        </ConfirmButton>
      ) : null}
      {canDelete && training.deleted_at ? (
        <Button variant="outline" onClick={restore}>
          <ArchiveRestoreIcon /> Restore
        </Button>
      ) : null}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign “{training.name}”</DialogTitle>
            <DialogDescription>Select employees and a due date. Employees with an active assignment are skipped.</DialogDescription>
          </DialogHeader>
          <AssignTrainingForm
            trainings={[training]}
            fixedTrainingId={training.id}
            employees={employees}
            departments={departments}
            alreadyAssigned={alreadyAssigned}
            onDone={() => setAssignOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PencilIcon, Trash2Icon, UserCheckIcon, UserXIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/shared/confirm-dialog";
import { deleteEmployeeAction, setEmployeeActiveAction } from "@/lib/actions/employees";

export function EmployeeActions({
  id,
  isActive,
  canEdit,
  canDelete,
}: {
  id: string;
  isActive: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();

  const toggleActive = async () => {
    const res = await setEmployeeActiveAction({ id, isActive: !isActive });
    if (res.ok) {
      toast.success(isActive ? "Employee deactivated." : "Employee activated.");
      router.refresh();
    } else toast.error(res.error);
  };

  const remove = async () => {
    const res = await deleteEmployeeAction({ id });
    if (res.ok) {
      toast.success("Employee deleted.");
      router.push("/employees");
    } else toast.error(res.error);
  };

  return (
    <>
      {canEdit ? (
        <Button variant="outline" render={<Link href={`/employees/${id}/edit`} />}>
          <PencilIcon /> Edit
        </Button>
      ) : null}
      {canEdit ? (
        <ConfirmButton
          variant="outline"
          title={isActive ? "Deactivate this employee?" : "Activate this employee?"}
          description={
            isActive
              ? "They will be hidden from active lists and pickers. Their history is kept."
              : "They will reappear in active lists and pickers."
          }
          confirmLabel={isActive ? "Deactivate" : "Activate"}
          onConfirm={toggleActive}
        >
          {isActive ? <UserXIcon /> : <UserCheckIcon />}
          {isActive ? "Deactivate" : "Activate"}
        </ConfirmButton>
      ) : null}
      {canDelete ? (
        <ConfirmButton
          variant="destructive"
          title="Delete this employee?"
          description="This permanently removes the employee and their training assignments. Prefer deactivating unless the record was created by mistake."
          confirmLabel="Delete"
          destructive
          onConfirm={remove}
        >
          <Trash2Icon /> Delete
        </ConfirmButton>
      ) : null}
    </>
  );
}

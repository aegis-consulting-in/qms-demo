"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "./confirm-dialog";
import type { ActionResult } from "@/lib/actions/result";

/**
 * Edit + delete buttons shared by every detail page. `deleteAction` must be a
 * server action taking `{ id }`; authorization happens inside it.
 */
export function EntityActions({
  id,
  editHref,
  canEdit,
  canDelete,
  deleteAction,
  deleteTitle = "Delete this record?",
  deleteDescription = "This action cannot be undone.",
  deleteLabel = "Delete",
  afterDeleteHref,
  children,
}: {
  id: string;
  editHref?: string;
  canEdit: boolean;
  canDelete: boolean;
  deleteAction: (input: { id: string }) => Promise<ActionResult>;
  deleteTitle?: string;
  deleteDescription?: string;
  deleteLabel?: string;
  afterDeleteHref: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const remove = async () => {
    const res = await deleteAction({ id });
    if (res.ok) {
      toast.success("Deleted.");
      router.push(afterDeleteHref as never);
    } else toast.error(res.error);
  };

  return (
    <>
      {children}
      {canEdit && editHref ? (
        <Button variant="outline" render={<Link href={editHref as never} />}>
          <PencilIcon /> Edit
        </Button>
      ) : null}
      {canDelete ? (
        <ConfirmButton variant="destructive" title={deleteTitle} description={deleteDescription} confirmLabel={deleteLabel} destructive onConfirm={remove}>
          <Trash2Icon /> {deleteLabel}
        </ConfirmButton>
      ) : null}
    </>
  );
}

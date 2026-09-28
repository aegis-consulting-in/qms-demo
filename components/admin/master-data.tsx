"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField } from "@/components/ui/form-field";
import { ConfirmButton } from "@/components/shared/confirm-dialog";
import { BooleanBadge } from "@/components/shared/status-badge";
import {
  createDepartmentAction,
  createJobTitleAction,
  deleteDepartmentAction,
  deleteJobTitleAction,
  updateDepartmentAction,
  updateJobTitleAction,
} from "@/lib/actions/admin";
import { useAction } from "@/lib/hooks/use-action";
import { departmentSchema, jobTitleSchema } from "@/lib/validation/admin";
import { DataTable, type Column } from "@/components/shared/data-table";

type DeptValues = z.input<typeof departmentSchema>;
type TitleValues = z.input<typeof jobTitleSchema>;

export function DepartmentManager({
  departments,
}: {
  departments: { id: string; name: string; code: string | null; description: string | null; is_active: boolean }[];
}) {
  const columns: Column<(typeof departments)[number]>[] = [
    { key: "name", header: "Department", cell: (d) => <span className="font-medium">{d.name}</span> },
    { key: "code", header: "Code", cell: (d) => d.code ?? "—", hideBelow: "sm" },
    { key: "active", header: "Active", cell: (d) => <BooleanBadge value={d.is_active} /> },
    {
      key: "actions",
      header: "",
      className: "w-24 text-right",
      cell: (d) => (
        <div className="flex justify-end gap-1">
          <DepartmentDialog department={d} />
          <DeleteMasterButton id={d.id} name={d.name} kind="department" />
        </div>
      ),
    },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <DepartmentDialog />
      </div>
      <DataTable columns={columns} rows={departments} rowKey={(r) => r.id} emptyTitle="No departments" />
    </div>
  );
}

function DepartmentDialog({ department }: { department?: { id: string; name: string; code: string | null; description: string | null; is_active: boolean } }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEdit = Boolean(department);
  const form = useForm<DeptValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: department?.name ?? "", code: department?.code ?? "", description: department?.description ?? "", isActive: department?.is_active ?? true },
  });
  const { run, isPending, error, fieldErrors } = useAction(
    async (values: DeptValues) => (isEdit ? updateDepartmentAction({ id: department!.id, ...values }) : createDepartmentAction(values)),
    { successMessage: isEdit ? "Department saved." : "Department created.", onSuccess: () => { setOpen(false); router.refresh(); } },
  );
  const err = (k: keyof DeptValues) => form.formState.errors[k]?.message ?? fieldErrors[k];

  return (
    <>
      {isEdit ? (
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label="Edit">
          <PencilIcon />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon /> New department
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit department" : "New department"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => run(v))} className="flex flex-col gap-3" noValidate>
            <FormError message={error} />
            <FormField label="Name" htmlFor="dept-name" required error={err("name")}>
              <Input id="dept-name" {...form.register("name")} />
            </FormField>
            <FormField label="Code" htmlFor="dept-code" error={err("code")}>
              <Input id="dept-code" {...form.register("code")} />
            </FormField>
            <FormField label="Description" htmlFor="dept-description" error={err("description")}>
              <Textarea id="dept-description" rows={2} {...form.register("description")} />
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.watch("isActive") as boolean} onCheckedChange={(c) => form.setValue("isActive", Boolean(c))} />
              Active
            </label>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2Icon className="animate-spin" /> : null} Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function JobTitleManager({ titles }: { titles: { id: string; name: string; description: string | null; is_active: boolean }[] }) {
  const columns: Column<(typeof titles)[number]>[] = [
    { key: "name", header: "Job title", cell: (t) => <span className="font-medium">{t.name}</span> },
    { key: "active", header: "Active", cell: (t) => <BooleanBadge value={t.is_active} /> },
    {
      key: "actions",
      header: "",
      className: "w-24 text-right",
      cell: (t) => (
        <div className="flex justify-end gap-1">
          <JobTitleDialog title={t} />
          <DeleteMasterButton id={t.id} name={t.name} kind="jobTitle" />
        </div>
      ),
    },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <JobTitleDialog />
      </div>
      <DataTable columns={columns} rows={titles} rowKey={(r) => r.id} emptyTitle="No job titles" />
    </div>
  );
}

function JobTitleDialog({ title }: { title?: { id: string; name: string; description: string | null; is_active: boolean } }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEdit = Boolean(title);
  const form = useForm<TitleValues>({
    resolver: zodResolver(jobTitleSchema),
    defaultValues: { name: title?.name ?? "", description: title?.description ?? "", isActive: title?.is_active ?? true },
  });
  const { run, isPending, error, fieldErrors } = useAction(
    async (values: TitleValues) => (isEdit ? updateJobTitleAction({ id: title!.id, ...values }) : createJobTitleAction(values)),
    { successMessage: isEdit ? "Job title saved." : "Job title created.", onSuccess: () => { setOpen(false); router.refresh(); } },
  );
  const err = (k: keyof TitleValues) => form.formState.errors[k]?.message ?? fieldErrors[k];

  return (
    <>
      {isEdit ? (
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label="Edit">
          <PencilIcon />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon /> New job title
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit job title" : "New job title"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => run(v))} className="flex flex-col gap-3" noValidate>
            <FormError message={error} />
            <FormField label="Name" htmlFor="jt-name" required error={err("name")}>
              <Input id="jt-name" {...form.register("name")} />
            </FormField>
            <FormField label="Description" htmlFor="jt-description" error={err("description")}>
              <Textarea id="jt-description" rows={2} {...form.register("description")} />
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.watch("isActive") as boolean} onCheckedChange={(c) => form.setValue("isActive", Boolean(c))} />
              Active
            </label>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2Icon className="animate-spin" /> : null} Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeleteMasterButton({ id, name, kind }: { id: string; name: string; kind: "department" | "jobTitle" }) {
  const router = useRouter();
  const remove = async () => {
    const res = kind === "department" ? await deleteDepartmentAction({ id }) : await deleteJobTitleAction({ id });
    if (res.ok) {
      toast.success("Deleted.");
      router.refresh();
    } else toast.error(res.error);
  };
  return (
    <ConfirmButton
      variant="ghost"
      size="icon-sm"
      className="text-destructive hover:text-destructive"
      title={`Delete ${name}?`}
      description="This fails if employees or other records still reference it. Deactivate instead when it is in use."
      confirmLabel="Delete"
      destructive
      onConfirm={remove}
    >
      <Trash2Icon />
    </ConfirmButton>
  );
}

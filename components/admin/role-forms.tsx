"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField } from "@/components/ui/form-field";
import { ConfirmButton } from "@/components/shared/confirm-dialog";
import { createRoleAction, deleteRoleAction, setRolePermissionsAction, updateRoleAction } from "@/lib/actions/admin";
import { useAction } from "@/lib/hooks/use-action";
import { humanize } from "@/lib/format";
import { roleSchema } from "@/lib/validation/admin";

type Values = z.input<typeof roleSchema>;
type Role = { id: string; name: string; description: string | null; is_system: boolean; permissionIds: string[]; userCount: number };
type Permission = { id: string; key: string; module: string; action: string; description: string | null };

export function RoleDialog({ role }: { role?: { id: string; name: string; description: string | null; is_system: boolean } }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEdit = Boolean(role);
  const form = useForm<Values>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: role?.name ?? "", description: role?.description ?? "" },
  });
  const { run, isPending, error, fieldErrors } = useAction(
    async (values: Values) => (isEdit ? updateRoleAction({ id: role!.id, ...values }) : createRoleAction(values)),
    {
      successMessage: isEdit ? "Role updated." : "Role created.",
      onSuccess: () => {
        setOpen(false);
        router.refresh();
      },
    },
  );
  const err = (k: keyof Values) => form.formState.errors[k]?.message ?? fieldErrors[k];

  return (
    <>
      {isEdit ? (
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label="Edit role">
          <PencilIcon />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon /> New role
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? `Edit ${role!.name}` : "New role"}</DialogTitle>
            <DialogDescription>Roles grant a set of permissions to every user they are assigned to.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => run(v))} className="flex flex-col gap-3" noValidate>
            <FormError message={error} />
            <FormField label="Name" htmlFor="role-name" required error={err("name")}>
              <Input id="role-name" disabled={role?.is_system} {...form.register("name")} />
            </FormField>
            <FormField label="Description" htmlFor="role-description" error={err("description")}>
              <Textarea id="role-description" rows={2} {...form.register("description")} />
            </FormField>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2Icon className="animate-spin" /> : null}
              {isEdit ? "Save" : "Create"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DeleteRoleButton({ id, name, isSystem, userCount }: { id: string; name: string; isSystem: boolean; userCount: number }) {
  const router = useRouter();
  if (isSystem) return null;
  const remove = async () => {
    const res = await deleteRoleAction({ id });
    if (res.ok) {
      toast.success("Role deleted.");
      router.refresh();
    } else toast.error(res.error);
  };
  return (
    <ConfirmButton
      variant="ghost"
      size="icon-sm"
      className="text-destructive hover:text-destructive"
      title={`Delete ${name}?`}
      description={userCount ? `${userCount} user(s) currently have this role. They will lose it.` : "This role will be removed."}
      confirmLabel="Delete"
      destructive
      onConfirm={remove}
    >
      <Trash2Icon />
    </ConfirmButton>
  );
}

export function RolePermissionsForm({ role, permissions }: { role: Role; permissions: Permission[] }) {
  const router = useRouter();
  const [ids, setIds] = useState(role.permissionIds);
  const [busy, setBusy] = useState(false);
  const locked = role.name === "Admin";

  const grouped = new Map<string, Permission[]>();
  for (const p of permissions) {
    const list = grouped.get(p.module) ?? [];
    list.push(p);
    grouped.set(p.module, list);
  }

  const toggle = (id: string) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = async () => {
    setBusy(true);
    const res = await setRolePermissionsAction({ roleId: role.id, permissionIds: ids });
    setBusy(false);
    if (res.ok) {
      toast.success("Permissions saved.");
      router.refresh();
    } else toast.error(res.error);
  };

  return (
    <div className="flex flex-col gap-4">
      {locked ? <p className="text-sm text-muted-foreground">The Admin role always holds every permission.</p> : null}
      {[...grouped.entries()].map(([module, perms]) => (
        <div key={module}>
          <h3 className="mb-2 text-sm font-semibold">{humanize(module)}</h3>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {perms.map((p) => (
              <li key={p.id}>
                <label className="flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-sm">
                  <Checkbox checked={locked || ids.includes(p.id)} disabled={locked} onCheckedChange={() => toggle(p.id)} />
                  <span>
                    <span className="font-medium">{humanize(p.action)}</span>
                    <span className="ml-1 font-mono text-[10px] text-muted-foreground">{p.key}</span>
                    {p.description ? <span className="block text-xs text-muted-foreground">{p.description}</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {!locked ? (
        <Button type="button" onClick={save} disabled={busy}>
          Save permissions
        </Button>
      ) : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRoundIcon, UserCheckIcon, UserXIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/shared/confirm-dialog";
import { FormError, FormField } from "@/components/ui/form-field";
import { adminResetPasswordAction, setUserActiveAction, setUserRolesAction } from "@/lib/actions/admin";
import { passwordSchema } from "@/lib/validation/auth";

export function UserRolesForm({
  userId,
  roles,
  currentRoleIds,
}: {
  userId: string;
  roles: { id: string; name: string; description: string | null }[];
  currentRoleIds: string[];
}) {
  const router = useRouter();
  const [roleIds, setRoleIds] = useState(currentRoleIds);
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => setRoleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = async () => {
    setBusy(true);
    const res = await setUserRolesAction({ userId, roleIds });
    setBusy(false);
    if (res.ok) {
      toast.success("Roles updated.");
      router.refresh();
    } else toast.error(res.error);
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid gap-2 sm:grid-cols-2">
        {roles.map((r) => (
          <li key={r.id}>
            <label className="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
              <Checkbox checked={roleIds.includes(r.id)} onCheckedChange={() => toggle(r.id)} />
              <span>
                <span className="font-medium">{r.name}</span>
                {r.description ? <span className="block text-xs text-muted-foreground">{r.description}</span> : null}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <Button type="button" onClick={save} disabled={busy}>
        Save roles
      </Button>
    </div>
  );
}

export function UserStatusButton({ userId, isActive }: { userId: string; isActive: boolean }) {
  const router = useRouter();
  const toggle = async () => {
    const res = await setUserActiveAction({ userId, isActive: !isActive });
    if (res.ok) {
      toast.success(isActive ? "User deactivated." : "User activated.");
      router.refresh();
    } else toast.error(res.error);
  };
  return (
    <ConfirmButton
      variant="outline"
      title={isActive ? "Deactivate this user?" : "Activate this user?"}
      description={isActive ? "They will be signed out and cannot log in." : "They will be able to log in again."}
      confirmLabel={isActive ? "Deactivate" : "Activate"}
      onConfirm={toggle}
    >
      {isActive ? <UserXIcon /> : <UserCheckIcon />}
      {isActive ? "Deactivate" : "Activate"}
    </ConfirmButton>
  );
}

export function AdminResetPasswordForm({ userId }: { userId: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid password.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await adminResetPasswordAction({ userId, newPassword: password });
    setBusy(false);
    if (res.ok) {
      toast.success("Password reset. The user must change it on next login.");
      setPassword("");
    } else toast.error(res.error);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <FormError message={error} />
      <FormField label="New temporary password" htmlFor="reset-password" hint="At least 8 characters, with a letter and a number.">
        <Input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </FormField>
      <Button type="submit" variant="outline" disabled={busy}>
        <KeyRoundIcon /> Reset password
      </Button>
    </form>
  );
}

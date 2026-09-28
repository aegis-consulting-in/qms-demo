"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField, FormGrid } from "@/components/ui/form-field";
import { assignTrainingAction } from "@/lib/actions/training";
import { useAction } from "@/lib/hooks/use-action";
import { todayISO } from "@/lib/format";

export type EmployeeOption = {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id?: string | null;
};

export function AssignTrainingForm({
  trainings,
  employees,
  departments = [],
  fixedTrainingId,
  alreadyAssigned = [],
  onDone,
}: {
  trainings: { id: string; name: string; code: string | null }[];
  employees: EmployeeOption[];
  departments?: { id: string; name: string }[];
  fixedTrainingId?: string;
  /** Employee ids with a live assignment for the fixed training (shown as disabled). */
  alreadyAssigned?: string[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [trainingId, setTrainingId] = useState(fixedTrainingId ?? trainings[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [assignedDate, setAssignedDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const assignedSet = useMemo(() => new Set(alreadyAssigned), [alreadyAssigned]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (department && e.department_id !== department) return false;
      if (!q) return true;
      return `${e.first_name} ${e.last_name} ${e.email} ${e.employee_code}`.toLowerCase().includes(q);
    });
  }, [employees, query, department]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAllVisible = () =>
    setSelected((s) => {
      const next = new Set(s);
      visible.forEach((e) => !assignedSet.has(e.id) && next.add(e.id));
      return next;
    });

  const { run, isPending, error, fieldErrors } = useAction(assignTrainingAction, {
    successMessage: (d) => (d.skipped ? `${d.created} assigned, ${d.skipped} already had an active assignment.` : `${d.created} assignment${d.created === 1 ? "" : "s"} created.`),
    onSuccess: () => {
      setSelected(new Set());
      onDone?.();
      router.refresh();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run({ trainingId, employeeIds: Array.from(selected), assignedDate, dueDate, notes });
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      <FormError message={error} />
      <FormGrid>
        {!fixedTrainingId ? (
          <FormField label="Training" htmlFor="trainingId" required error={fieldErrors.trainingId} className="md:col-span-2">
            <NativeSelect id="trainingId" value={trainingId} onChange={(e) => setTrainingId(e.target.value)}>
              {trainings.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code ? `${t.code} · ` : ""}
                  {t.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        ) : null}
        <FormField label="Assigned date" htmlFor="assignedDate" required error={fieldErrors.assignedDate}>
          <Input id="assignedDate" type="date" value={assignedDate} onChange={(e) => setAssignedDate(e.target.value)} />
        </FormField>
        <FormField label="Due date" htmlFor="dueDate" error={fieldErrors.dueDate}>
          <Input id="dueDate" type="date" value={dueDate} min={assignedDate} onChange={(e) => setDueDate(e.target.value)} />
        </FormField>
      </FormGrid>

      <FormField
        label={
          <span className="flex items-center justify-between gap-2">
            Employees <span className="text-xs font-normal text-muted-foreground">{selected.size} selected</span>
          </span>
        }
        required
        error={fieldErrors.employeeIds}
      >
        <div className="rounded-lg border">
          <div className="flex flex-col gap-2 border-b p-2 sm:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter employees…" className="pl-8" aria-label="Filter employees" />
            </div>
            {departments.length ? (
              <NativeSelect value={department} onChange={(e) => setDepartment(e.target.value)} className="sm:w-48" aria-label="Department">
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </NativeSelect>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>
              Select visible
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())} disabled={!selected.size}>
              Clear
            </Button>
          </div>
          <ul className="max-h-72 divide-y overflow-y-auto">
            {visible.length ? (
              visible.map((e) => {
                const disabled = assignedSet.has(e.id);
                const checked = selected.has(e.id);
                return (
                  <li key={e.id}>
                    <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50", disabled && "cursor-not-allowed opacity-60")}>
                      <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => toggle(e.id)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {e.first_name} {e.last_name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {e.employee_code} · {e.email}
                        </span>
                      </span>
                      {disabled ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckIcon className="size-3.5" /> Assigned
                        </span>
                      ) : null}
                    </label>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">No employees match.</li>
            )}
          </ul>
        </div>
      </FormField>

      <FormField label="Notes" htmlFor="notes" error={fieldErrors.notes}>
        <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional instructions for the assignees" />
      </FormField>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending || !selected.size || !trainingId}>
          {isPending ? <Loader2Icon className="animate-spin" /> : null}
          Assign to {selected.size || ""} employee{selected.size === 1 ? "" : "s"}
        </Button>
      </div>
    </form>
  );
}

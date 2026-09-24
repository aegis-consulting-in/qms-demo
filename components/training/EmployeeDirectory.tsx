"use client";

import { Eye, Pencil, Plus, ToggleLeft, ToggleRight, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useQms, useSession } from "@/lib/store";
import type { Employee, RecordStatus } from "@/lib/types";
import { createId, matchesQuery, nowIso } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CellStack, DataTable, RowActions, type Column } from "@/components/ui/DataTable";
import { DetailRow } from "@/components/ui/Documents";
import { Field, FormGrid, Input, Select } from "@/components/ui/Form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { FilterBar, SearchInput, StatusFilterTabs, type StatusFilterValue } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";

const departments = [
  "Quality Assurance",
  "Quality Control",
  "Production",
  "Engineering",
  "Regulatory Affairs",
  "Operations",
  "Warehouse",
  "Procurement",
];

interface EmployeeForm {
  employeeId: string;
  name: string;
  department: string;
  email: string;
  jobRole: string;
  reportsTo: string;
  status: RecordStatus;
}

const blankForm: EmployeeForm = {
  employeeId: "",
  name: "",
  department: departments[0],
  email: "",
  jobRole: "",
  reportsTo: "",
  status: "Active",
};

export function EmployeeDirectory() {
  const { state, add, update } = useQms();
  const { isManager } = useSession();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("Active");
  const [editing, setEditing] = useState<Employee | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EmployeeForm>(blankForm);
  const [errors, setErrors] = useState<Partial<Record<keyof EmployeeForm, string>>>({});
  const [viewing, setViewing] = useState<Employee | null>(null);
  const [toggling, setToggling] = useState<Employee | null>(null);

  const counts = useMemo(
    () => ({
      All: state.employees.length,
      Active: state.employees.filter((employee) => employee.status === "Active").length,
      Inactive: state.employees.filter((employee) => employee.status === "Inactive").length,
    }),
    [state.employees],
  );

  const rows = useMemo(
    () =>
      state.employees.filter(
        (employee) =>
          (statusFilter === "All" || employee.status === statusFilter) &&
          matchesQuery(
            query,
            employee.name,
            employee.employeeId,
            employee.department,
            employee.email,
            employee.jobRole,
          ),
      ),
    [state.employees, statusFilter, query],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditing(employee);
    setForm({
      employeeId: employee.employeeId,
      name: employee.name,
      department: employee.department,
      email: employee.email,
      jobRole: employee.jobRole,
      reportsTo: employee.reportsTo ?? "",
      status: employee.status,
    });
    setErrors({});
    setFormOpen(true);
  };

  const submit = () => {
    const nextErrors: Partial<Record<keyof EmployeeForm, string>> = {};
    if (!form.employeeId.trim()) nextErrors.employeeId = "Employee ID is required";
    if (!form.name.trim()) nextErrors.name = "Name is required";
    if (!form.jobRole.trim()) nextErrors.jobRole = "Role is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = "Enter a valid email";

    const duplicate = state.employees.find(
      (employee) =>
        employee.employeeId.toLowerCase() === form.employeeId.trim().toLowerCase() &&
        employee.id !== editing?.id,
    );
    if (duplicate) nextErrors.employeeId = "This Employee ID already exists";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      employeeId: form.employeeId.trim(),
      name: form.name.trim(),
      department: form.department,
      email: form.email.trim(),
      jobRole: form.jobRole.trim(),
      reportsTo: form.reportsTo || undefined,
      status: form.status,
    };

    if (editing) {
      update("employees", editing.id, payload);
      toast.push(`${payload.name} updated.`);
    } else {
      add("employees", { id: createId("emp"), createdAt: nowIso(), ...payload });
      toast.push(`${payload.name} added to the directory.`);
    }
    setFormOpen(false);
  };

  const columns: Array<Column<Employee>> = [
    {
      key: "name",
      header: "Employee",
      render: (employee) => <CellStack primary={employee.name} secondary={employee.employeeId} />,
    },
    {
      key: "department",
      header: "Department",
      render: (employee) => <span className="text-sm">{employee.department}</span>,
    },
    {
      key: "jobRole",
      header: "Role",
      hideBelow: "md",
      render: (employee) => <span className="text-sm">{employee.jobRole}</span>,
    },
    {
      key: "email",
      header: "Email",
      hideBelow: "lg",
      render: (employee) => <span className="text-sm text-slate-600">{employee.email}</span>,
    },
    {
      key: "manager",
      header: "Reports to",
      hideBelow: "xl",
      render: (employee) => (
        <span className="text-sm text-slate-600">
          {state.employees.find((item) => item.id === employee.reportsTo)?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (employee) => <StatusBadge status={employee.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (employee) => (
        <RowActions>
          <IconButton
            label={`View ${employee.name}`}
            icon={<Eye className="h-4 w-4" />}
            onClick={() => setViewing(employee)}
          />
          {isManager ? (
            <>
              <IconButton
                label={`Edit ${employee.name}`}
                icon={<Pencil className="h-4 w-4" />}
                onClick={() => openEdit(employee)}
              />
              <IconButton
                label={employee.status === "Active" ? "Deactivate" : "Reactivate"}
                icon={
                  employee.status === "Active" ? (
                    <ToggleRight className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-slate-400" />
                  )
                }
                onClick={() => setToggling(employee)}
              />
            </>
          ) : null}
        </RowActions>
      ),
    },
  ];

  const viewingAssignments = viewing
    ? state.assignments.filter((assignment) => assignment.employeeId === viewing.id)
    : [];

  return (
    <Card>
      <CardHeader
        title="Employee details"
        description="HR master data used across training assignments and approvals"
        icon={<Users className="h-4 w-4" />}
        actions={
          isManager ? (
            <Button icon={<Plus className="h-4 w-4" />} size="sm" onClick={openCreate}>
              Add employee
            </Button>
          ) : null
        }
      />
      <FilterBar>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by name, ID, department or email…"
          className="sm:w-80"
        />
        <StatusFilterTabs value={statusFilter} onChange={setStatusFilter} counts={counts} />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        emptyTitle="No employees match this filter"
        emptyMessage="Adjust the search term or switch the status filter."
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Add employee"}
        description="Employees marked inactive are retained for audit history but excluded from new assignments."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>{editing ? "Save changes" : "Add employee"}</Button>
          </>
        }
      >
        <FormGrid>
          <Field label="Employee ID" required error={errors.employeeId}>
            <Input
              value={form.employeeId}
              placeholder="EMP-1008"
              onChange={(event) => setForm({ ...form, employeeId: event.target.value })}
            />
          </Field>
          <Field label="Full name" required error={errors.name}>
            <Input
              value={form.name}
              placeholder="Jane Cooper"
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="Department" required>
            <Select
              value={form.department}
              onChange={(event) => setForm({ ...form, department: event.target.value })}
            >
              {departments.map((department) => (
                <option key={department}>{department}</option>
              ))}
            </Select>
          </Field>
          <Field label="Role / designation" required error={errors.jobRole}>
            <Input
              value={form.jobRole}
              placeholder="QA Engineer"
              onChange={(event) => setForm({ ...form, jobRole: event.target.value })}
            />
          </Field>
          <Field label="Email" required error={errors.email}>
            <Input
              type="email"
              value={form.email}
              placeholder="jane.cooper@northwind-labs.com"
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </Field>
          <Field label="Reports to" hint="Used to route training approvals">
            <Select
              value={form.reportsTo}
              onChange={(event) => setForm({ ...form, reportsTo: event.target.value })}
            >
              <option value="">Not assigned</option>
              {state.employees
                .filter((employee) => employee.status === "Active" && employee.id !== editing?.id)
                .map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} — {employee.jobRole}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as RecordStatus })}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </Field>
        </FormGrid>
      </Modal>

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.name ?? ""}
        description={viewing ? `${viewing.jobRole} · ${viewing.department}` : undefined}
        footer={
          <Button variant="secondary" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      >
        {viewing ? (
          <div className="space-y-5">
            <dl className="divide-y divide-slate-100">
              <DetailRow label="Employee ID">{viewing.employeeId}</DetailRow>
              <DetailRow label="Email">{viewing.email}</DetailRow>
              <DetailRow label="Department">{viewing.department}</DetailRow>
              <DetailRow label="Reports to">
                {state.employees.find((item) => item.id === viewing.reportsTo)?.name ?? "—"}
              </DetailRow>
              <DetailRow label="Status">
                <StatusBadge status={viewing.status} />
              </DetailRow>
            </dl>
            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Training record ({viewingAssignments.length})
              </h3>
              {viewingAssignments.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500">
                  No training assigned to this employee yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {viewingAssignments.map((assignment) => (
                    <li
                      key={assignment.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 ring-1 ring-inset ring-slate-200"
                    >
                      <span className="min-w-0 truncate text-sm text-slate-800">
                        {state.courses.find((course) => course.id === assignment.courseId)?.title ??
                          "Unknown course"}
                      </span>
                      <StatusBadge status={assignment.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(toggling)}
        onClose={() => setToggling(null)}
        title={toggling?.status === "Active" ? "Deactivate employee" : "Reactivate employee"}
        tone={toggling?.status === "Active" ? "danger" : "primary"}
        confirmLabel={toggling?.status === "Active" ? "Deactivate" : "Reactivate"}
        message={
          toggling?.status === "Active" ? (
            <>
              <strong>{toggling?.name}</strong> will be marked inactive. Existing training history is kept
              but the employee is hidden from new assignments.
            </>
          ) : (
            <>
              <strong>{toggling?.name}</strong> will become active and selectable for new training
              assignments.
            </>
          )
        }
        onConfirm={() => {
          if (!toggling) return;
          const next: RecordStatus = toggling.status === "Active" ? "Inactive" : "Active";
          update("employees", toggling.id, { status: next });
          toast.push(`${toggling.name} is now ${next.toLowerCase()}.`, "info");
        }}
      />
    </Card>
  );
}

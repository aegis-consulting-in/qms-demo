"use client";

import { CalendarPlus, Trash2, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useQms, useSession } from "@/lib/store";
import type { TrainingAssignment, TrainingProgressStatus } from "@/lib/types";
import { createId, cx, formatDate, matchesQuery, nowIso, shiftDays, todayIso } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { CellStack, DataTable, RowActions, type Column } from "@/components/ui/DataTable";
import { Field, FormGrid, Input, Select } from "@/components/ui/Form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { RestrictedNotice } from "@/components/ui/PageHeader";
import { FilterBar, SearchInput } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";

const workflowFilters: Array<TrainingProgressStatus | "All"> = [
  "All",
  "Pending",
  "In Progress",
  "Waiting for Approval",
  "Approved",
  "Rejected",
];

export function AssignTraining() {
  const { state, add, remove, update } = useQms();
  const { isManager, actorName } = useSession();
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(shiftDays(30));
  const [error, setError] = useState("");

  const [listQuery, setListQuery] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState<TrainingProgressStatus | "All">("All");
  const [deleting, setDeleting] = useState<TrainingAssignment | null>(null);
  const [rescheduling, setRescheduling] = useState<TrainingAssignment | null>(null);
  const [newDueDate, setNewDueDate] = useState("");

  const activeCourses = state.courses.filter((course) => course.status === "Active");
  const activeEmployees = useMemo(
    () =>
      state.employees.filter(
        (employee) =>
          employee.status === "Active" &&
          matchesQuery(employeeQuery, employee.name, employee.employeeId, employee.department),
      ),
    [state.employees, employeeQuery],
  );

  const rows = useMemo(
    () =>
      state.assignments.filter((assignment) => {
        const course = state.courses.find((item) => item.id === assignment.courseId);
        const employee = state.employees.find((item) => item.id === assignment.employeeId);
        return (
          (workflowFilter === "All" || assignment.status === workflowFilter) &&
          matchesQuery(listQuery, course?.title, course?.code, employee?.name, employee?.employeeId)
        );
      }),
    [state.assignments, state.courses, state.employees, workflowFilter, listQuery],
  );

  const alreadyAssigned = useMemo(
    () =>
      new Set(
        state.assignments
          .filter(
            (assignment) => assignment.courseId === courseId && assignment.status !== "Rejected",
          )
          .map((assignment) => assignment.employeeId),
      ),
    [state.assignments, courseId],
  );

  const resetForm = () => {
    setCourseId("");
    setSelected([]);
    setEmployeeQuery("");
    setStartDate(todayIso());
    setDueDate(shiftDays(30));
    setError("");
  };

  const submit = () => {
    if (!courseId) {
      setError("Select a training course to assign.");
      return;
    }
    if (selected.length === 0) {
      setError("Select at least one employee.");
      return;
    }
    if (dueDate < startDate) {
      setError("The completion deadline must be on or after the start date.");
      return;
    }

    const targets = selected.filter((employeeId) => !alreadyAssigned.has(employeeId));
    targets.forEach((employeeId) => {
      add("assignments", {
        id: createId("asg"),
        courseId,
        employeeId,
        assignedBy: actorName,
        startDate,
        dueDate,
        status: "Pending",
        documents: [],
        history: [{ id: createId("hist"), at: nowIso(), actor: actorName, action: "Assigned" }],
      });
    });

    const skipped = selected.length - targets.length;
    toast.push(
      `Assigned to ${targets.length} employee${targets.length === 1 ? "" : "s"}${
        skipped > 0 ? ` · ${skipped} already had this course` : ""
      }.`,
      targets.length > 0 ? "success" : "warning",
    );
    setFormOpen(false);
    resetForm();
  };

  if (!isManager) {
    return (
      <RestrictedNotice message="Only Managers and System Admins can assign training. Switch the simulated role from the header menu to continue." />
    );
  }

  const columns: Array<Column<TrainingAssignment>> = [
    {
      key: "employee",
      header: "Employee",
      render: (assignment) => {
        const employee = state.employees.find((item) => item.id === assignment.employeeId);
        return <CellStack primary={employee?.name ?? "Unknown"} secondary={employee?.department} />;
      },
    },
    {
      key: "course",
      header: "Training",
      render: (assignment) => {
        const course = state.courses.find((item) => item.id === assignment.courseId);
        return <CellStack primary={course?.title ?? "Unknown"} secondary={course?.code} />;
      },
    },
    {
      key: "window",
      header: "Window",
      hideBelow: "md",
      render: (assignment) => (
        <span className="text-xs text-slate-600">
          {formatDate(assignment.startDate)} → {formatDate(assignment.dueDate)}
        </span>
      ),
    },
    {
      key: "assignedBy",
      header: "Assigned by",
      hideBelow: "xl",
      render: (assignment) => <span className="text-sm text-slate-600">{assignment.assignedBy}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (assignment) => <StatusBadge status={assignment.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (assignment) => (
        <RowActions>
          <IconButton
            label="Reschedule deadline"
            icon={<CalendarPlus className="h-4 w-4" />}
            onClick={() => {
              setRescheduling(assignment);
              setNewDueDate(assignment.dueDate);
            }}
          />
          <IconButton
            label="Remove assignment"
            icon={<Trash2 className="h-4 w-4" />}
            className="hover:bg-rose-50 hover:text-rose-600"
            onClick={() => setDeleting(assignment)}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Create employee training"
        description="Assign registry courses to employees with a start date and completion deadline"
        icon={<UserPlus className="h-4 w-4" />}
        actions={
          <Button
            size="sm"
            icon={<UserPlus className="h-4 w-4" />}
            onClick={() => {
              resetForm();
              setFormOpen(true);
            }}
          >
            Assign training
          </Button>
        }
      />
      <FilterBar>
        <SearchInput
          value={listQuery}
          onChange={setListQuery}
          placeholder="Search assignments by employee or course…"
          className="sm:w-80"
        />
        <div className="sm:w-52">
          <Select
            value={workflowFilter}
            onChange={(event) => setWorkflowFilter(event.target.value as TrainingProgressStatus | "All")}
          >
            {workflowFilters.map((filter) => (
              <option key={filter} value={filter}>
                {filter === "All" ? "All workflow statuses" : filter}
              </option>
            ))}
          </Select>
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        emptyTitle="No assignments yet"
        emptyMessage="Assign a course to one or more employees to start the workflow."
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Assign training to employees"
        description="Select a course, choose the employees, then set the training window."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>
              Assign to {selected.length} employee{selected.length === 1 ? "" : "s"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <FormGrid>
            <Field label="Training course" required className="sm:col-span-2">
              <Select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
                <option value="">Select a course…</option>
                {activeCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} — {course.title} ({course.frequency})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Start date" required>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </Field>
            <Field label="Completion deadline" required>
              <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </Field>
          </FormGrid>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <Users className="h-3.5 w-3.5" />
                Employees ({selected.length} selected)
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() =>
                    setSelected(
                      activeEmployees
                        .filter((employee) => !alreadyAssigned.has(employee.id))
                        .map((employee) => employee.id),
                    )
                  }
                >
                  Select all
                </Button>
                <Button variant="ghost" size="xs" onClick={() => setSelected([])}>
                  Clear
                </Button>
              </div>
            </div>
            <SearchInput
              value={employeeQuery}
              onChange={setEmployeeQuery}
              placeholder="Filter employees…"
              className="mb-2"
            />
            <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl bg-slate-50 p-2 ring-1 ring-inset ring-slate-200">
              {activeEmployees.map((employee) => {
                const disabled = alreadyAssigned.has(employee.id);
                const checked = selected.includes(employee.id);
                return (
                  <label
                    key={employee.id}
                    className={cx(
                      "flex items-center gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-inset transition-colors",
                      disabled
                        ? "cursor-not-allowed opacity-60 ring-slate-200"
                        : checked
                          ? "cursor-pointer ring-indigo-300"
                          : "cursor-pointer ring-slate-200 hover:ring-slate-300",
                    )}
                  >
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={checked}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, employee.id]
                            : current.filter((id) => id !== employee.id),
                        )
                      }
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {employee.name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {employee.employeeId} · {employee.department} · {employee.jobRole}
                      </span>
                    </span>
                    {disabled ? (
                      <span className="shrink-0 text-[11px] font-semibold text-amber-700">
                        Already assigned
                      </span>
                    ) : null}
                  </label>
                );
              })}
              {activeEmployees.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-slate-500">
                  No active employees match this filter.
                </p>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(rescheduling)}
        onClose={() => setRescheduling(null)}
        title="Reschedule completion deadline"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRescheduling(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!rescheduling) return;
                update("assignments", rescheduling.id, (current) => ({
                  dueDate: newDueDate,
                  history: [
                    ...current.history,
                    {
                      id: createId("hist"),
                      at: nowIso(),
                      actor: actorName,
                      action: "Deadline rescheduled",
                      note: `New deadline ${formatDate(newDueDate)}`,
                    },
                  ],
                }));
                toast.push("Deadline updated.", "info");
                setRescheduling(null);
              }}
            >
              Save deadline
            </Button>
          </>
        }
      >
        <CardBody className="px-0 py-0">
          <Field label="New completion deadline" required>
            <Input type="date" value={newDueDate} onChange={(event) => setNewDueDate(event.target.value)} />
          </Field>
        </CardBody>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Remove assignment"
        confirmLabel="Remove"
        message="The assignment and its submission history will be deleted from local storage."
        onConfirm={() => {
          if (!deleting) return;
          remove("assignments", deleting.id);
          toast.push("Assignment removed.", "info");
        }}
      />
    </Card>
  );
}

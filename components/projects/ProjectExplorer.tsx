"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Flag,
  FolderKanban,
  Layers,
  ListTodo,
  Pencil,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQms, useSession } from "@/lib/store";
import type {
  Project,
  ProjectMilestone,
  ProjectPhase,
  ProjectTask,
  RecordStatus,
  TaskStatus,
} from "@/lib/types";
import {
  createId,
  cx,
  daysUntil,
  dueLabel,
  formatDate,
  matchesQuery,
  nowIso,
  percent,
  shiftDays,
  todayIso,
} from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, ProgressBar } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/DataTable";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/Form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { FilterBar, SearchInput, StatusFilterTabs, type StatusFilterValue } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";

const taskStatuses: TaskStatus[] = ["To Do", "In Progress", "Blocked", "Completed"];

type DialogState =
  | { kind: "project"; project: Project | null }
  | { kind: "phase"; projectId: string; phase: ProjectPhase | null }
  | { kind: "milestone"; phaseId: string; milestone: ProjectMilestone | null }
  | { kind: "task"; milestoneId: string; task: ProjectTask | null }
  | null;

export function ProjectExplorer() {
  const { state, update, remove } = useQms();
  const { isManager } = useSession();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("Active");
  const [selectedId, setSelectedId] = useState<string | null>(state.projects[0]?.id ?? null);
  const [expandedPhases, setExpandedPhases] = useState<string[]>(() =>
    state.phases.slice(0, 1).map((phase) => phase.id),
  );
  const [expandedMilestones, setExpandedMilestones] = useState<string[]>([]);
  const [dialog, setDialogState] = useState<DialogState>(null);
  // Bumped on every open so the dialog remounts with a freshly seeded form.
  const [dialogInstance, setDialogInstance] = useState(0);
  const setDialog = (next: DialogState) => {
    setDialogState(next);
    if (next) setDialogInstance((current) => current + 1);
  };
  const [deleting, setDeleting] = useState<
    { kind: "phase" | "milestone" | "task"; id: string; label: string } | null
  >(null);

  const counts = useMemo(
    () => ({
      All: state.projects.length,
      Active: state.projects.filter((project) => project.status === "Active").length,
      Inactive: state.projects.filter((project) => project.status === "Inactive").length,
    }),
    [state.projects],
  );

  const visibleProjects = useMemo(
    () =>
      state.projects.filter(
        (project) =>
          (statusFilter === "All" || project.status === statusFilter) &&
          matchesQuery(query, project.name, project.code, project.owner, project.description),
      ),
    [state.projects, statusFilter, query],
  );

  const selected = selectedId ? (state.projects.find((project) => project.id === selectedId) ?? null) : null;

  const metrics = (projectId: string) => {
    const phases = state.phases.filter((phase) => phase.projectId === projectId);
    const milestones = state.milestones.filter((milestone) =>
      phases.some((phase) => phase.id === milestone.phaseId),
    );
    const tasks = state.tasks.filter((task) =>
      milestones.some((milestone) => milestone.id === task.milestoneId),
    );
    const doneTasks = tasks.filter((task) => task.status === "Completed").length;
    return {
      phases,
      milestones,
      tasks,
      progress: tasks.length
        ? percent(doneTasks, tasks.length)
        : percent(milestones.filter((milestone) => milestone.completed).length, milestones.length),
    };
  };

  const toggleIn = (list: string[], id: string) =>
    list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader
          title="Projects"
          description="Level 1 — project setup"
          icon={<FolderKanban className="h-4 w-4" />}
          actions={
            isManager ? (
              <Button
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setDialog({ kind: "project", project: null })}
              >
                New
              </Button>
            ) : null
          }
        />
        <FilterBar className="flex-col items-stretch sm:flex-col sm:items-stretch">
          <SearchInput value={query} onChange={setQuery} placeholder="Search projects…" />
          <StatusFilterTabs value={statusFilter} onChange={setStatusFilter} counts={counts} />
        </FilterBar>
        {visibleProjects.length === 0 ? (
          <EmptyState title="No projects match" message="Adjust the search or status filter." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {visibleProjects.map((project) => {
              const { phases, milestones, progress } = metrics(project.id);
              const active = project.id === selectedId;
              return (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(project.id)}
                    className={cx(
                      "w-full px-4 py-3 text-left transition-colors sm:px-5",
                      active ? "bg-indigo-50/70" : "hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{project.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {project.code} · {project.owner}
                        </p>
                      </div>
                      <StatusBadge status={project.status} />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <ProgressBar
                        value={progress}
                        tone={progress >= 75 ? "emerald" : progress >= 40 ? "indigo" : "amber"}
                      />
                      <span className="shrink-0 text-[11px] font-semibold text-slate-600">{progress}%</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {phases.length} phases · {milestones.length} milestones
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {!selected ? (
        <Card>
          <EmptyState
            icon={<FolderKanban className="h-5 w-5" />}
            title="Select a project"
            message="Pick a project from the list to drill into its phases, milestones and tasks."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={selected.name}
              description={`${selected.code} · owner ${selected.owner}`}
              icon={<FolderKanban className="h-4 w-4" />}
              actions={
                isManager ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Pencil className="h-3.5 w-3.5" />}
                      onClick={() => setDialog({ kind: "project", project: selected })}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={
                        selected.status === "Active" ? (
                          <ToggleRight className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="h-3.5 w-3.5 text-slate-400" />
                        )
                      }
                      onClick={() => {
                        const next: RecordStatus = selected.status === "Active" ? "Inactive" : "Active";
                        update("projects", selected.id, { status: next });
                        toast.push(`${selected.name} is now ${next.toLowerCase()}.`, "info");
                      }}
                    >
                      {selected.status === "Active" ? "Deactivate" : "Reactivate"}
                    </Button>
                    <Button
                      size="sm"
                      icon={<Plus className="h-3.5 w-3.5" />}
                      onClick={() => setDialog({ kind: "phase", projectId: selected.id, phase: null })}
                    >
                      Add phase
                    </Button>
                  </>
                ) : null
              }
            />
            <CardBody className="space-y-3">
              <p className="text-sm text-slate-600">{selected.description}</p>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Start</p>
                  <p className="text-sm font-medium text-slate-800">{formatDate(selected.startDate)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Expected completion</p>
                  <p className="text-sm font-medium text-slate-800">
                    {formatDate(selected.expectedCompletionDate)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Timeline</p>
                  <p className="text-sm font-medium text-slate-800">
                    {dueLabel(selected.expectedCompletionDate)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Task progress</p>
                  <p className="text-sm font-medium text-slate-800">{metrics(selected.id).progress}%</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Execution breakdown"
              description="Level 2 phases → Level 3 milestones → Level 4 tasks"
              icon={<Layers className="h-4 w-4" />}
            />
            {metrics(selected.id).phases.length === 0 ? (
              <EmptyState
                icon={<Layers className="h-5 w-5" />}
                title="No phases yet"
                message="Add a phase such as “Requirement Gathering Phase” to start structuring the work."
                action={
                  isManager ? (
                    <Button
                      size="sm"
                      icon={<Plus className="h-3.5 w-3.5" />}
                      onClick={() => setDialog({ kind: "phase", projectId: selected.id, phase: null })}
                    >
                      Add phase
                    </Button>
                  ) : null
                }
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {metrics(selected.id).phases.map((phase) => {
                  const phaseMilestones = state.milestones.filter(
                    (milestone) => milestone.phaseId === phase.id,
                  );
                  const phaseTasks = state.tasks.filter((task) =>
                    phaseMilestones.some((milestone) => milestone.id === task.milestoneId),
                  );
                  const phaseProgress = phaseTasks.length
                    ? percent(
                        phaseTasks.filter((task) => task.status === "Completed").length,
                        phaseTasks.length,
                      )
                    : percent(
                        phaseMilestones.filter((milestone) => milestone.completed).length,
                        phaseMilestones.length,
                      );
                  const expanded = expandedPhases.includes(phase.id);

                  return (
                    <li key={phase.id}>
                      <div className="flex items-start gap-2 px-3 py-3 sm:px-4">
                        <button
                          type="button"
                          onClick={() => setExpandedPhases((current) => toggleIn(current, phase.id))}
                          className="mt-0.5 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={expanded ? "Collapse phase" : "Expand phase"}
                        >
                          {expanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">{phase.name}</p>
                            <StatusBadge status={phase.status} />
                            <Badge tone="slate">{phaseMilestones.length} milestones</Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">{phase.description}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(phase.startDate)} → {formatDate(phase.endDate)}
                            </span>
                            <span className="font-semibold text-slate-600">{phaseProgress}% complete</span>
                          </div>
                          <ProgressBar
                            value={phaseProgress}
                            className="mt-2 max-w-md"
                            tone={phaseProgress >= 75 ? "emerald" : "indigo"}
                          />
                        </div>
                        {isManager ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <IconButton
                              label="Add milestone"
                              icon={<Plus className="h-4 w-4" />}
                              onClick={() => {
                                setExpandedPhases((current) =>
                                  current.includes(phase.id) ? current : [...current, phase.id],
                                );
                                setDialog({ kind: "milestone", phaseId: phase.id, milestone: null });
                              }}
                            />
                            <IconButton
                              label="Edit phase"
                              icon={<Pencil className="h-4 w-4" />}
                              onClick={() =>
                                setDialog({ kind: "phase", projectId: selected.id, phase })
                              }
                            />
                            <IconButton
                              label="Delete phase"
                              icon={<Trash2 className="h-4 w-4" />}
                              className="hover:bg-rose-50 hover:text-rose-600"
                              onClick={() =>
                                setDeleting({ kind: "phase", id: phase.id, label: phase.name })
                              }
                            />
                          </div>
                        ) : null}
                      </div>

                      {expanded ? (
                        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-3 py-3 sm:px-6">
                          {phaseMilestones.length === 0 ? (
                            <p className="rounded-lg bg-white px-3 py-2.5 text-xs text-slate-500 ring-1 ring-inset ring-slate-200">
                              No milestones in this phase yet.
                            </p>
                          ) : (
                            phaseMilestones.map((milestone) => {
                              const milestoneTasks = state.tasks.filter(
                                (task) => task.milestoneId === milestone.id,
                              );
                              const open = expandedMilestones.includes(milestone.id);
                              const overdue = !milestone.completed && daysUntil(milestone.dueDate) < 0;
                              return (
                                <div
                                  key={milestone.id}
                                  className="rounded-xl bg-white ring-1 ring-inset ring-slate-200"
                                >
                                  <div className="flex items-start gap-2 px-3 py-2.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedMilestones((current) => toggleIn(current, milestone.id))
                                      }
                                      className="mt-0.5 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                      aria-label={open ? "Collapse milestone" : "Expand milestone"}
                                    >
                                      {open ? (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronRight className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                    <input
                                      type="checkbox"
                                      checked={milestone.completed}
                                      disabled={!isManager}
                                      onChange={(event) =>
                                        update("milestones", milestone.id, {
                                          completed: event.target.checked,
                                        })
                                      }
                                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                      aria-label={`Mark ${milestone.name} complete`}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p
                                          className={cx(
                                            "text-sm font-medium",
                                            milestone.completed
                                              ? "text-slate-400 line-through"
                                              : "text-slate-900",
                                          )}
                                        >
                                          <Flag className="mr-1 inline h-3 w-3 text-indigo-500" />
                                          {milestone.name}
                                        </p>
                                        <Badge tone={overdue ? "rose" : milestone.completed ? "emerald" : "slate"}>
                                          {milestone.completed ? "Completed" : dueLabel(milestone.dueDate)}
                                        </Badge>
                                        <Badge tone="slate">{milestoneTasks.length} tasks</Badge>
                                      </div>
                                      <p className="mt-0.5 text-xs text-slate-500">{milestone.description}</p>
                                      <p className="mt-0.5 text-[11px] text-slate-400">
                                        Due {formatDate(milestone.dueDate)}
                                      </p>
                                    </div>
                                    {isManager ? (
                                      <div className="flex shrink-0 items-center gap-1">
                                        <IconButton
                                          label="Add task"
                                          icon={<Plus className="h-3.5 w-3.5" />}
                                          onClick={() => {
                                            setExpandedMilestones((current) =>
                                              current.includes(milestone.id)
                                                ? current
                                                : [...current, milestone.id],
                                            );
                                            setDialog({
                                              kind: "task",
                                              milestoneId: milestone.id,
                                              task: null,
                                            });
                                          }}
                                        />
                                        <IconButton
                                          label="Edit milestone"
                                          icon={<Pencil className="h-3.5 w-3.5" />}
                                          onClick={() =>
                                            setDialog({ kind: "milestone", phaseId: phase.id, milestone })
                                          }
                                        />
                                        <IconButton
                                          label="Delete milestone"
                                          icon={<Trash2 className="h-3.5 w-3.5" />}
                                          className="hover:bg-rose-50 hover:text-rose-600"
                                          onClick={() =>
                                            setDeleting({
                                              kind: "milestone",
                                              id: milestone.id,
                                              label: milestone.name,
                                            })
                                          }
                                        />
                                      </div>
                                    ) : null}
                                  </div>

                                  {open ? (
                                    <div className="space-y-1.5 border-t border-slate-100 px-3 py-2.5">
                                      {milestoneTasks.length === 0 ? (
                                        <p className="text-xs text-slate-500">
                                          No tasks yet — add individual work items to this milestone.
                                        </p>
                                      ) : (
                                        milestoneTasks.map((task) => {
                                          const assignee = state.employees.find(
                                            (employee) => employee.id === task.assigneeId,
                                          );
                                          return (
                                            <div
                                              key={task.id}
                                              className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2"
                                            >
                                              <ListTodo className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                              <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-medium text-slate-800">
                                                  {task.title}
                                                </p>
                                                <p className="truncate text-[11px] text-slate-500">
                                                  {assignee?.name ?? "Unassigned"} · due{" "}
                                                  {formatDate(task.dueDate)}
                                                </p>
                                              </div>
                                              <div className="w-32 shrink-0">
                                                <Select
                                                  value={task.status}
                                                  disabled={!isManager}
                                                  onChange={(event) =>
                                                    update("tasks", task.id, {
                                                      status: event.target.value as TaskStatus,
                                                    })
                                                  }
                                                  className="py-1 text-xs"
                                                >
                                                  {taskStatuses.map((status) => (
                                                    <option key={status}>{status}</option>
                                                  ))}
                                                </Select>
                                              </div>
                                              {isManager ? (
                                                <div className="flex items-center gap-0.5">
                                                  <IconButton
                                                    label="Edit task"
                                                    icon={<Pencil className="h-3.5 w-3.5" />}
                                                    onClick={() =>
                                                      setDialog({
                                                        kind: "task",
                                                        milestoneId: milestone.id,
                                                        task,
                                                      })
                                                    }
                                                  />
                                                  <IconButton
                                                    label="Delete task"
                                                    icon={<Trash2 className="h-3.5 w-3.5" />}
                                                    className="hover:bg-rose-50 hover:text-rose-600"
                                                    onClick={() =>
                                                      setDeleting({
                                                        kind: "task",
                                                        id: task.id,
                                                        label: task.title,
                                                      })
                                                    }
                                                  />
                                                </div>
                                              ) : null}
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}

      {dialog ? (
        <HierarchyDialog
          key={dialogInstance}
          dialog={dialog}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            toast.push(message);
            setDialog(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.kind ?? ""}`}
        confirmLabel="Delete"
        message={
          <>
            <strong>{deleting?.label}</strong> and everything nested underneath it will be removed from
            local storage.
          </>
        }
        onConfirm={() => {
          if (!deleting) return;
          if (deleting.kind === "phase") {
            const milestoneIds = state.milestones
              .filter((milestone) => milestone.phaseId === deleting.id)
              .map((milestone) => milestone.id);
            state.tasks
              .filter((task) => milestoneIds.includes(task.milestoneId))
              .forEach((task) => remove("tasks", task.id));
            milestoneIds.forEach((id) => remove("milestones", id));
            remove("phases", deleting.id);
          } else if (deleting.kind === "milestone") {
            state.tasks
              .filter((task) => task.milestoneId === deleting.id)
              .forEach((task) => remove("tasks", task.id));
            remove("milestones", deleting.id);
          } else {
            remove("tasks", deleting.id);
          }
          toast.push(`${deleting.label} deleted.`, "info");
        }}
      />
    </div>
  );
}

function seedValues(
  dialog: NonNullable<DialogState>,
  fallbackAssigneeId: string,
): Record<string, string> {
  if (dialog.kind === "project") {
    return {
      code: dialog.project?.code ?? "",
      name: dialog.project?.name ?? "",
      owner: dialog.project?.owner ?? "",
      description: dialog.project?.description ?? "",
      startDate: dialog.project?.startDate ?? todayIso(),
      expectedCompletionDate: dialog.project?.expectedCompletionDate ?? shiftDays(90),
      status: dialog.project?.status ?? "Active",
    };
  }
  if (dialog.kind === "phase") {
    return {
      name: dialog.phase?.name ?? "",
      description: dialog.phase?.description ?? "",
      startDate: dialog.phase?.startDate ?? todayIso(),
      endDate: dialog.phase?.endDate ?? shiftDays(30),
      status: dialog.phase?.status ?? "Active",
    };
  }
  if (dialog.kind === "milestone") {
    return {
      name: dialog.milestone?.name ?? "",
      description: dialog.milestone?.description ?? "",
      dueDate: dialog.milestone?.dueDate ?? shiftDays(14),
      completed: dialog.milestone?.completed ? "yes" : "no",
    };
  }
  return {
    title: dialog.task?.title ?? "",
    description: dialog.task?.description ?? "",
    assigneeId: dialog.task?.assigneeId ?? fallbackAssigneeId,
    dueDate: dialog.task?.dueDate ?? shiftDays(7),
    status: dialog.task?.status ?? "To Do",
  };
}

function HierarchyDialog({
  dialog,
  onClose,
  onSaved,
}: {
  dialog: NonNullable<DialogState>;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { state, add, update } = useQms();
  const [values, setValues] = useState<Record<string, string>>(() =>
    seedValues(dialog, state.employees.find((employee) => employee.status === "Active")?.id ?? ""),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const submit = () => {
    const nextErrors: Record<string, string> = {};

    if (dialog.kind === "project") {
      if (!values.name?.trim()) nextErrors.name = "Project name is required";
      if (!values.code?.trim()) nextErrors.code = "Project code is required";
      if (!values.owner?.trim()) nextErrors.owner = "Owner is required";
      if (values.expectedCompletionDate < values.startDate)
        nextErrors.expectedCompletionDate = "Completion must follow the start date";
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return;

      const payload = {
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        owner: values.owner.trim(),
        description: values.description?.trim() ?? "",
        startDate: values.startDate,
        expectedCompletionDate: values.expectedCompletionDate,
        status: values.status as RecordStatus,
      };
      if (dialog.project) {
        update("projects", dialog.project.id, payload);
        onSaved(`${payload.name} updated.`);
      } else {
        add("projects", { id: createId("prj"), createdAt: nowIso(), ...payload });
        onSaved(`${payload.name} created.`);
      }
      return;
    }

    if (dialog.kind === "phase") {
      if (!values.name?.trim()) nextErrors.name = "Phase name is required";
      if (values.endDate < values.startDate) nextErrors.endDate = "End date must follow the start date";
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return;

      const payload = {
        projectId: dialog.projectId,
        name: values.name.trim(),
        description: values.description?.trim() ?? "",
        startDate: values.startDate,
        endDate: values.endDate,
        status: values.status as RecordStatus,
      };
      if (dialog.phase) {
        update("phases", dialog.phase.id, payload);
        onSaved(`${payload.name} updated.`);
      } else {
        add("phases", { id: createId("phs"), createdAt: nowIso(), ...payload });
        onSaved(`Phase “${payload.name}” added.`);
      }
      return;
    }

    if (dialog.kind === "milestone") {
      if (!values.name?.trim()) nextErrors.name = "Milestone name is required";
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return;

      const payload = {
        phaseId: dialog.phaseId,
        name: values.name.trim(),
        description: values.description?.trim() ?? "",
        dueDate: values.dueDate,
        completed: values.completed === "yes",
      };
      if (dialog.milestone) {
        update("milestones", dialog.milestone.id, payload);
        onSaved(`${payload.name} updated.`);
      } else {
        add("milestones", { id: createId("mls"), createdAt: nowIso(), ...payload });
        onSaved(`Milestone “${payload.name}” added.`);
      }
      return;
    }

    if (!values.title?.trim()) nextErrors.title = "Task title is required";
    if (!values.assigneeId) nextErrors.assigneeId = "Assign the task to an employee";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      milestoneId: dialog.milestoneId,
      title: values.title.trim(),
      description: values.description?.trim() ?? "",
      assigneeId: values.assigneeId,
      dueDate: values.dueDate,
      status: values.status as TaskStatus,
    };
    if (dialog.task) {
      update("tasks", dialog.task.id, payload);
      onSaved(`${payload.title} updated.`);
    } else {
      add("tasks", { id: createId("tsk"), createdAt: nowIso(), ...payload });
      onSaved(`Task “${payload.title}” added.`);
    }
  };

  const titles: Record<NonNullable<DialogState>["kind"], string> = {
    project: "Project setup",
    phase: "Phase",
    milestone: "Milestone",
    task: "Task",
  };

  const isEditing =
    (dialog.kind === "project" && dialog.project) ||
    (dialog.kind === "phase" && dialog.phase) ||
    (dialog.kind === "milestone" && dialog.milestone) ||
    (dialog.kind === "task" && dialog.task);

  return (
    <Modal
      open
      onClose={onClose}
      title={`${isEditing ? "Edit" : "Add"} ${titles[dialog.kind].toLowerCase()}`}
      description={
        dialog.kind === "project"
          ? "Level 1 — the top of the execution hierarchy."
          : dialog.kind === "phase"
            ? "Level 2 — a high-level stage such as “Requirement Gathering Phase”."
            : dialog.kind === "milestone"
              ? "Level 3 — a checkpoint such as “Discuss Requirements with Client”."
              : "Level 4 — an individual work item with an assignee and completion status."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{isEditing ? "Save changes" : "Create"}</Button>
        </>
      }
    >
      <FormGrid>
        {dialog.kind === "project" ? (
          <>
            <Field label="Project code" required error={errors.code}>
              <Input value={values.code ?? ""} placeholder="PRJ-QMS-04" onChange={(event) => set("code", event.target.value)} />
            </Field>
            <Field label="Project name" required error={errors.name}>
              <Input
                value={values.name ?? ""}
                placeholder="Supplier Portal Rollout"
                onChange={(event) => set("name", event.target.value)}
              />
            </Field>
            <Field label="Owner" required error={errors.owner}>
              <Input
                value={values.owner ?? ""}
                placeholder="Sofia Almeida"
                onChange={(event) => set("owner", event.target.value)}
              />
            </Field>
            <Field label="Status">
              <Select value={values.status ?? "Active"} onChange={(event) => set("status", event.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </Field>
            <Field label="Start date" required>
              <Input type="date" value={values.startDate ?? ""} onChange={(event) => set("startDate", event.target.value)} />
            </Field>
            <Field label="Expected completion" required error={errors.expectedCompletionDate}>
              <Input
                type="date"
                value={values.expectedCompletionDate ?? ""}
                onChange={(event) => set("expectedCompletionDate", event.target.value)}
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea
                rows={3}
                value={values.description ?? ""}
                placeholder="Scope, objective and success criteria."
                onChange={(event) => set("description", event.target.value)}
              />
            </Field>
          </>
        ) : null}

        {dialog.kind === "phase" ? (
          <>
            <Field label="Phase name" required error={errors.name} className="sm:col-span-2">
              <Input
                value={values.name ?? ""}
                placeholder="Requirement Gathering Phase"
                onChange={(event) => set("name", event.target.value)}
              />
            </Field>
            <Field label="Start date" required>
              <Input type="date" value={values.startDate ?? ""} onChange={(event) => set("startDate", event.target.value)} />
            </Field>
            <Field label="End date" required error={errors.endDate}>
              <Input type="date" value={values.endDate ?? ""} onChange={(event) => set("endDate", event.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={values.status ?? "Active"} onChange={(event) => set("status", event.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={values.description ?? ""}
                placeholder="What this phase delivers."
                onChange={(event) => set("description", event.target.value)}
              />
            </Field>
          </>
        ) : null}

        {dialog.kind === "milestone" ? (
          <>
            <Field label="Milestone name" required error={errors.name} className="sm:col-span-2">
              <Input
                value={values.name ?? ""}
                placeholder="Discuss Requirements with Client"
                onChange={(event) => set("name", event.target.value)}
              />
            </Field>
            <Field label="Due date" required>
              <Input type="date" value={values.dueDate ?? ""} onChange={(event) => set("dueDate", event.target.value)} />
            </Field>
            <Field label="Completed">
              <Select value={values.completed ?? "no"} onChange={(event) => set("completed", event.target.value)}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </Select>
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={values.description ?? ""}
                placeholder="Definition of done for this checkpoint."
                onChange={(event) => set("description", event.target.value)}
              />
            </Field>
          </>
        ) : null}

        {dialog.kind === "task" ? (
          <>
            <Field label="Task title" required error={errors.title} className="sm:col-span-2">
              <Input
                value={values.title ?? ""}
                placeholder="Run QA department workshop"
                onChange={(event) => set("title", event.target.value)}
              />
            </Field>
            <Field label="Assignee" required error={errors.assigneeId}>
              <Select value={values.assigneeId ?? ""} onChange={(event) => set("assigneeId", event.target.value)}>
                <option value="">Select an employee…</option>
                {state.employees
                  .filter((employee) => employee.status === "Active")
                  .map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} — {employee.jobRole}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Due date" required>
              <Input type="date" value={values.dueDate ?? ""} onChange={(event) => set("dueDate", event.target.value)} />
            </Field>
            <Field label="Completion status">
              <Select value={values.status ?? "To Do"} onChange={(event) => set("status", event.target.value)}>
                {taskStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </Select>
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={values.description ?? ""}
                placeholder="What needs to be done."
                onChange={(event) => set("description", event.target.value)}
              />
            </Field>
          </>
        ) : null}
      </FormGrid>
    </Modal>
  );
}

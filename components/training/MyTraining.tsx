"use client";

import {
  CircleDashed,
  Clock,
  GraduationCap,
  History,
  PlayCircle,
  Send,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQms, useSession } from "@/lib/store";
import type { TrainingAssignment, TrainingProgressStatus } from "@/lib/types";
import { createId, cx, daysUntil, dueLabel, formatDate, formatDateTime, matchesQuery, nowIso, percent } from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, ProgressBar, StatTile } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/DataTable";
import { DetailRow, DocumentList, FileUploadZone, SectionLabel } from "@/components/ui/Documents";
import { Modal } from "@/components/ui/Modal";
import { FilterBar, SearchInput, Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";

const statusFilters: Array<{ id: TrainingProgressStatus | "All"; label: string }> = [
  { id: "All", label: "All" },
  { id: "Pending", label: "Pending" },
  { id: "In Progress", label: "In Progress" },
  { id: "Waiting for Approval", label: "Waiting" },
  { id: "Approved", label: "Approved" },
  { id: "Rejected", label: "Rejected" },
];

export function MyTraining() {
  const { state, update } = useQms();
  const { currentUser, actorName } = useSession();
  const toast = useToast();

  const [filter, setFilter] = useState<TrainingProgressStatus | "All">("All");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const mine = useMemo(
    () => state.assignments.filter((assignment) => assignment.employeeId === currentUser?.id),
    [state.assignments, currentUser?.id],
  );

  const visible = useMemo(
    () =>
      mine.filter((assignment) => {
        const course = state.courses.find((item) => item.id === assignment.courseId);
        return (
          (filter === "All" || assignment.status === filter) &&
          matchesQuery(query, course?.title, course?.code, course?.description)
        );
      }),
    [mine, state.courses, filter, query],
  );

  const open = openId ? (mine.find((assignment) => assignment.id === openId) ?? null) : null;
  const openCourse = open ? state.courses.find((course) => course.id === open.courseId) : undefined;

  const appendHistory = (
    assignment: TrainingAssignment,
    action: string,
    note?: string,
  ): TrainingAssignment["history"] => [
    ...assignment.history,
    { id: createId("hist"), at: nowIso(), actor: actorName, action, note },
  ];

  const startTraining = (assignment: TrainingAssignment) => {
    update("assignments", assignment.id, {
      status: "In Progress",
      startedAt: nowIso(),
      history: appendHistory(assignment, "Started training"),
    });
    toast.push("Training started. Attach your completion evidence when you are done.", "info");
  };

  const submitForReview = (assignment: TrainingAssignment) => {
    if (assignment.documents.length === 0) {
      toast.push("Attach at least one completion document before submitting.", "warning");
      return;
    }
    update("assignments", assignment.id, {
      status: "Waiting for Approval",
      submittedAt: nowIso(),
      reviewComments: undefined,
      history: appendHistory(
        assignment,
        "Submitted for review",
        `${assignment.documents.length} document(s) attached`,
      ),
    });
    toast.push("Submitted for manager review.");
  };

  const counts = {
    pending: mine.filter((assignment) => assignment.status === "Pending").length,
    inProgress: mine.filter((assignment) => assignment.status === "In Progress").length,
    waiting: mine.filter((assignment) => assignment.status === "Waiting for Approval").length,
    approved: mine.filter((assignment) => assignment.status === "Approved").length,
    rejected: mine.filter((assignment) => assignment.status === "Rejected").length,
  };

  if (!currentUser) {
    return (
      <Card>
        <EmptyState title="No user selected" message="Pick a signed-in employee from the header menu." />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Assigned to me"
          value={mine.length}
          hint={`${counts.pending} not started`}
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatTile
          label="In progress"
          value={counts.inProgress}
          hint="Attach evidence to submit"
          tone="sky"
          icon={<PlayCircle className="h-5 w-5" />}
        />
        <StatTile
          label="Waiting for approval"
          value={counts.waiting}
          hint="With your reporting manager"
          tone="amber"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatTile
          label="Approved"
          value={counts.approved}
          hint={`${counts.rejected} rejected`}
          tone="emerald"
          icon={<ThumbsUp className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader
          title={`My training — ${currentUser.name}`}
          description="Track assigned courses, attach completion evidence and submit for approval"
          icon={<GraduationCap className="h-4 w-4" />}
          actions={
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Completion</span>
              <span className="text-sm font-semibold text-slate-900">
                {percent(counts.approved, mine.length)}%
              </span>
            </div>
          }
        />
        <FilterBar>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search my courses…"
            className="sm:w-72"
          />
          <Tabs
            items={statusFilters.map((item) => ({
              id: item.id,
              label: item.label,
              count:
                item.id === "All"
                  ? mine.length
                  : mine.filter((assignment) => assignment.status === item.id).length,
            }))}
            value={filter}
            onChange={setFilter}
          />
        </FilterBar>

        {visible.length === 0 ? (
          <EmptyState
            icon={<CircleDashed className="h-5 w-5" />}
            title="Nothing to show"
            message="No assigned training matches the current filter."
          />
        ) : (
          <CardBody className="grid gap-3 lg:grid-cols-2">
            {visible.map((assignment) => {
              const course = state.courses.find((item) => item.id === assignment.courseId);
              const days = daysUntil(assignment.dueDate);
              const overdue = days < 0 && assignment.status !== "Approved";
              return (
                <article
                  key={assignment.id}
                  className={cx(
                    "flex flex-col gap-3 rounded-xl p-4 ring-1 ring-inset transition-shadow hover:shadow-sm",
                    overdue ? "bg-rose-50/40 ring-rose-200" : "bg-white ring-slate-200",
                  )}
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {course?.title ?? "Unknown course"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {course?.code} · {course?.frequency} · {course?.durationHours}h
                      </p>
                    </div>
                    <StatusBadge status={assignment.status} />
                  </header>

                  <p className="line-clamp-2 text-xs text-slate-600">{course?.description}</p>

                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500">
                      {formatDate(assignment.startDate)} → {formatDate(assignment.dueDate)}
                    </span>
                    <Badge tone={overdue ? "rose" : days <= 7 ? "amber" : "slate"}>
                      {dueLabel(assignment.dueDate)}
                    </Badge>
                  </div>

                  {assignment.status === "Rejected" && assignment.reviewComments ? (
                    <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">
                      <span className="font-semibold">Rejected by {assignment.reviewedBy}:</span>{" "}
                      {assignment.reviewComments}
                    </p>
                  ) : null}

                  {assignment.status === "Approved" ? (
                    <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      <span className="font-semibold">Approved by {assignment.reviewedBy}</span>
                      {typeof assignment.score === "number" ? ` · score ${assignment.score}%` : ""}
                    </p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    {assignment.status === "Pending" ? (
                      <Button
                        size="sm"
                        icon={<PlayCircle className="h-3.5 w-3.5" />}
                        onClick={() => startTraining(assignment)}
                      >
                        Start training
                      </Button>
                    ) : null}
                    {assignment.status === "In Progress" || assignment.status === "Rejected" ? (
                      <>
                        <FileUploadZone
                          compact
                          label="Attach completion document"
                          uploadedBy={actorName}
                          category="Completion evidence"
                          onFiles={(documents) => {
                            update("assignments", assignment.id, (current) => ({
                              documents: [...current.documents, ...documents],
                              status: current.status === "Rejected" ? "In Progress" : current.status,
                              history: [
                                ...current.history,
                                {
                                  id: createId("hist"),
                                  at: nowIso(),
                                  actor: actorName,
                                  action: "Attached document",
                                  note: documents.map((document) => document.name).join(", "),
                                },
                              ],
                            }));
                            toast.push(`${documents.length} document(s) attached.`);
                          }}
                        />
                        <Button
                          size="sm"
                          variant="success"
                          icon={<Send className="h-3.5 w-3.5" />}
                          onClick={() => submitForReview(assignment)}
                        >
                          Submit for review
                        </Button>
                      </>
                    ) : null}
                    <Button variant="ghost" size="sm" onClick={() => setOpenId(assignment.id)}>
                      Details
                      {assignment.documents.length > 0 ? ` (${assignment.documents.length})` : ""}
                    </Button>
                  </div>
                </article>
              );
            })}
          </CardBody>
        )}
      </Card>

      <Modal
        open={Boolean(open)}
        onClose={() => setOpenId(null)}
        title={openCourse?.title ?? "Training details"}
        description={openCourse ? `${openCourse.code} · ${openCourse.frequency}` : undefined}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setOpenId(null)}>
            Close
          </Button>
        }
      >
        {open ? (
          <div className="space-y-5">
            <dl className="divide-y divide-slate-100">
              <DetailRow label="Status">
                <StatusBadge status={open.status} />
              </DetailRow>
              <DetailRow label="Training window">
                {formatDate(open.startDate)} → {formatDate(open.dueDate)} ({dueLabel(open.dueDate)})
              </DetailRow>
              <DetailRow label="Assigned by">{open.assignedBy}</DetailRow>
              {open.reviewComments ? (
                <DetailRow label="Reviewer comments">{open.reviewComments}</DetailRow>
              ) : null}
              {typeof open.score === "number" ? (
                <DetailRow label="Approval score">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={open.score} className="max-w-[10rem]" tone="emerald" />
                    <span className="text-xs font-semibold">{open.score}%</span>
                  </div>
                </DetailRow>
              ) : null}
            </dl>

            <div>
              <SectionLabel>Completion documents</SectionLabel>
              <DocumentList
                documents={open.documents}
                onRemove={
                  open.status === "In Progress" || open.status === "Rejected"
                    ? (document) =>
                        update("assignments", open.id, (current) => ({
                          documents: current.documents.filter((item) => item.id !== document.id),
                        }))
                    : undefined
                }
              />
            </div>

            <div>
              <SectionLabel>
                <span className="inline-flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  Workflow history
                </span>
              </SectionLabel>
              <ol className="space-y-2.5 border-l border-slate-200 pl-4">
                {open.history.map((entry) => (
                  <li key={entry.id} className="relative">
                    <span className="absolute top-1.5 -left-[21px] h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white" />
                    <p className="text-sm font-medium text-slate-800">{entry.action}</p>
                    <p className="text-xs text-slate-500">
                      {entry.actor} · {formatDateTime(entry.at)}
                    </p>
                    {entry.note ? <p className="text-xs text-slate-600">{entry.note}</p> : null}
                  </li>
                ))}
              </ol>
            </div>

            {open.status === "In Progress" || open.status === "Rejected" ? (
              <div>
                <SectionLabel>Add more evidence</SectionLabel>
                <FileUploadZone
                  uploadedBy={actorName}
                  category="Completion evidence"
                  onFiles={(documents) =>
                    update("assignments", open.id, (current) => ({
                      documents: [...current.documents, ...documents],
                      status: current.status === "Rejected" ? "In Progress" : current.status,
                      history: [
                        ...current.history,
                        {
                          id: createId("hist"),
                          at: nowIso(),
                          actor: actorName,
                          action: "Attached document",
                          note: documents.map((document) => document.name).join(", "),
                        },
                      ],
                    }))
                  }
                />
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="success"
                    size="sm"
                    icon={<Send className="h-3.5 w-3.5" />}
                    onClick={() => {
                      submitForReview(open);
                      setOpenId(null);
                    }}
                  >
                    Submit for review
                  </Button>
                </div>
              </div>
            ) : null}

            {open.status === "Waiting for Approval" ? (
              <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
                <Clock className="h-4 w-4 shrink-0" />
                Submitted on {formatDateTime(open.submittedAt)}. Waiting for a manager decision in the
                Manage Training queue.
              </p>
            ) : null}

            {open.status === "Rejected" ? (
              <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">
                <ThumbsDown className="h-4 w-4 shrink-0" />
                Attach corrected evidence to move this record back to In Progress, then resubmit.
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

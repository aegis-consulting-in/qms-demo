"use client";

import { ClipboardCheck, Eye, Inbox, ThumbsDown, ThumbsUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useQms, useSession } from "@/lib/store";
import type { TrainingAssignment } from "@/lib/types";
import { createId, dueLabel, formatDate, formatDateTime, matchesQuery, nowIso } from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CellStack, DataTable, EmptyState, RowActions, type Column } from "@/components/ui/DataTable";
import { DetailRow, DocumentList, SectionLabel } from "@/components/ui/Documents";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { RestrictedNotice } from "@/components/ui/PageHeader";
import { FilterBar, SearchInput, Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";

type Queue = "Waiting for Approval" | "Approved" | "Rejected";

export function ManageTraining() {
  const { state, update } = useQms();
  const { isManager, actorName } = useSession();
  const toast = useToast();

  const [queue, setQueue] = useState<Queue>("Waiting for Approval");
  const [query, setQuery] = useState("");
  const [reviewing, setReviewing] = useState<TrainingAssignment | null>(null);
  const [comments, setComments] = useState("");
  const [score, setScore] = useState("85");
  const [error, setError] = useState("");

  const byQueue = useMemo(
    () => ({
      "Waiting for Approval": state.assignments.filter(
        (assignment) => assignment.status === "Waiting for Approval",
      ),
      Approved: state.assignments.filter((assignment) => assignment.status === "Approved"),
      Rejected: state.assignments.filter((assignment) => assignment.status === "Rejected"),
    }),
    [state.assignments],
  );

  const rows = useMemo(
    () =>
      byQueue[queue].filter((assignment) => {
        const course = state.courses.find((item) => item.id === assignment.courseId);
        const employee = state.employees.find((item) => item.id === assignment.employeeId);
        return matchesQuery(query, course?.title, course?.code, employee?.name, employee?.department);
      }),
    [byQueue, queue, query, state.courses, state.employees],
  );

  if (!isManager) {
    return (
      <RestrictedNotice message="Training approvals are limited to Managers and System Admins. Switch the simulated role in the header to review submissions." />
    );
  }

  const openReview = (assignment: TrainingAssignment) => {
    setReviewing(assignment);
    setComments(assignment.reviewComments ?? "");
    setScore(assignment.score ? String(assignment.score) : "85");
    setError("");
  };

  const decide = (decision: "Approved" | "Rejected") => {
    if (!reviewing) return;
    if (decision === "Rejected" && !comments.trim()) {
      setError("A rejection needs a comment so the employee knows what to fix.");
      return;
    }
    update("assignments", reviewing.id, (current) => ({
      status: decision,
      reviewedAt: nowIso(),
      reviewedBy: actorName,
      reviewComments: comments.trim() || undefined,
      score: decision === "Approved" ? Number(score) || undefined : undefined,
      history: [
        ...current.history,
        {
          id: createId("hist"),
          at: nowIso(),
          actor: actorName,
          action: decision === "Approved" ? "Approved" : "Rejected",
          note: comments.trim() || undefined,
        },
      ],
    }));
    toast.push(
      decision === "Approved"
        ? "Approved and moved to the approved archive."
        : "Rejected and returned to the employee.",
      decision === "Approved" ? "success" : "warning",
    );
    setReviewing(null);
  };

  const columns: Array<Column<TrainingAssignment>> = [
    {
      key: "employee",
      header: "Employee",
      render: (assignment) => {
        const employee = state.employees.find((item) => item.id === assignment.employeeId);
        return (
          <CellStack
            primary={employee?.name ?? "Unknown"}
            secondary={`${employee?.employeeId ?? "—"} · ${employee?.department ?? ""}`}
          />
        );
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
      key: "documents",
      header: "Evidence",
      align: "center",
      render: (assignment) => (
        <Badge tone={assignment.documents.length > 0 ? "sky" : "slate"}>
          {assignment.documents.length} file{assignment.documents.length === 1 ? "" : "s"}
        </Badge>
      ),
    },
    {
      key: "submitted",
      header: queue === "Waiting for Approval" ? "Submitted" : "Reviewed",
      hideBelow: "md",
      render: (assignment) => (
        <span className="text-xs text-slate-600">
          {formatDateTime(
            queue === "Waiting for Approval" ? assignment.submittedAt : assignment.reviewedAt,
          )}
        </span>
      ),
    },
    {
      key: "due",
      header: "Deadline",
      hideBelow: "lg",
      render: (assignment) => (
        <div className="text-xs">
          <p className="text-slate-700">{formatDate(assignment.dueDate)}</p>
          <p className="text-slate-400">{dueLabel(assignment.dueDate)}</p>
        </div>
      ),
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
          <Button
            size="sm"
            variant={queue === "Waiting for Approval" ? "primary" : "secondary"}
            icon={
              queue === "Waiting for Approval" ? (
                <ClipboardCheck className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )
            }
            onClick={() => openReview(assignment)}
          >
            {queue === "Waiting for Approval" ? "Review" : "View"}
          </Button>
        </RowActions>
      ),
    },
  ];

  const reviewEmployee = reviewing
    ? state.employees.find((employee) => employee.id === reviewing.employeeId)
    : undefined;
  const reviewCourse = reviewing
    ? state.courses.find((course) => course.id === reviewing.courseId)
    : undefined;
  const decided = reviewing?.status === "Approved" || reviewing?.status === "Rejected";

  return (
    <Card>
      <CardHeader
        title="Manage training"
        description="Manager queue for submitted completion evidence, with approved and rejected archives"
        icon={<ClipboardCheck className="h-4 w-4" />}
        actions={
          <Badge tone={byQueue["Waiting for Approval"].length > 0 ? "amber" : "emerald"} dot>
            {byQueue["Waiting for Approval"].length} pending decision
          </Badge>
        }
      />
      <FilterBar>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search submissions by employee or course…"
          className="sm:w-80"
        />
        <Tabs
          items={[
            { id: "Waiting for Approval", label: "Pending queue", count: byQueue["Waiting for Approval"].length },
            { id: "Approved", label: "Approved archive", count: byQueue.Approved.length },
            { id: "Rejected", label: "Rejected archive", count: byQueue.Rejected.length },
          ]}
          value={queue}
          onChange={setQueue}
        />
      </FilterBar>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title={
            queue === "Waiting for Approval" ? "Review queue is clear" : `No records in the ${queue.toLowerCase()} archive`
          }
          message={
            queue === "Waiting for Approval"
              ? "Submissions from My Training land here for approval or rejection."
              : "Decisions you make in the pending queue are archived here."
          }
        />
      ) : (
        <DataTable columns={columns} rows={rows} />
      )}

      <Modal
        open={Boolean(reviewing)}
        onClose={() => setReviewing(null)}
        title={decided ? "Submission record" : "Review submission"}
        description={
          reviewEmployee && reviewCourse
            ? `${reviewEmployee.name} · ${reviewCourse.code} — ${reviewCourse.title}`
            : undefined
        }
        size="lg"
        footer={
          decided ? (
            <Button variant="secondary" onClick={() => setReviewing(null)}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setReviewing(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                icon={<ThumbsDown className="h-4 w-4" />}
                onClick={() => decide("Rejected")}
              >
                Reject
              </Button>
              <Button
                variant="success"
                icon={<ThumbsUp className="h-4 w-4" />}
                onClick={() => decide("Approved")}
              >
                Approve
              </Button>
            </>
          )
        }
      >
        {reviewing ? (
          <div className="space-y-5">
            <dl className="divide-y divide-slate-100">
              <DetailRow label="Employee">
                {reviewEmployee?.name} · {reviewEmployee?.jobRole}
              </DetailRow>
              <DetailRow label="Department">{reviewEmployee?.department}</DetailRow>
              <DetailRow label="Training window">
                {formatDate(reviewing.startDate)} → {formatDate(reviewing.dueDate)} (
                {dueLabel(reviewing.dueDate)})
              </DetailRow>
              <DetailRow label="Submitted">{formatDateTime(reviewing.submittedAt)}</DetailRow>
              {reviewing.reviewedAt ? (
                <DetailRow label="Decision">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={reviewing.status} />
                    <span className="text-xs text-slate-500">
                      by {reviewing.reviewedBy} on {formatDateTime(reviewing.reviewedAt)}
                    </span>
                  </div>
                </DetailRow>
              ) : null}
            </dl>

            <div>
              <SectionLabel>Submitted evidence</SectionLabel>
              <DocumentList
                documents={reviewing.documents}
                emptyMessage="The employee submitted without attaching a document."
              />
            </div>

            {decided ? (
              reviewing.reviewComments ? (
                <div>
                  <SectionLabel>Reviewer comments</SectionLabel>
                  <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
                    {reviewing.reviewComments}
                  </p>
                </div>
              ) : null
            ) : (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <Field
                  label="Comments"
                  hint="Required when rejecting. Shared with the employee in My Training."
                >
                  <Textarea
                    rows={3}
                    value={comments}
                    placeholder="Evidence reviewed against the course assessment criteria…"
                    onChange={(event) => {
                      setComments(event.target.value);
                      setError("");
                    }}
                  />
                </Field>
                <Field label="Approval score (%)" hint="Recorded on the approved training record.">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={score}
                    onChange={(event) => setScore(event.target.value)}
                    className="sm:max-w-[10rem]"
                  />
                </Field>
                {error ? (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
                    {error}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </Card>
  );
}

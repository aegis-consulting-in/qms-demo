"use client";

import {
  ArrowLeft,
  BarChart3,
  ClipboardCheck,
  FileCheck2,
  GitBranch,
  Gauge,
  Pencil,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQms, useSession } from "@/lib/store";
import type {
  Audit,
  AuditKpi,
  AuditSubProcess,
  ClauseCheck,
  ComplianceVerdict,
  RecordStatus,
} from "@/lib/types";
import { createId, cx, formatDate, formatDateTime, matchesQuery, nowIso, shiftDays } from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, ProgressBar } from "@/components/ui/Card";
import { CellStack, DataTable, EmptyState, RowActions, type Column } from "@/components/ui/DataTable";
import { DetailRow, DocumentList, FileUploadZone, SectionLabel } from "@/components/ui/Documents";
import { Checkbox, Field, FormGrid, Input, Select, Textarea } from "@/components/ui/Form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { FilterBar, SearchInput, StatusFilterTabs, Tabs, type StatusFilterValue } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";

const verdicts: ComplianceVerdict[] = ["Compliant", "Minor NC", "Major NC", "Not Applicable"];

type ExecutionTab = "kpis" | "evidence" | "effectiveness";

export function AuditWorkspace() {
  const { state } = useQms();
  const [openAuditId, setOpenAuditId] = useState<string | null>(null);

  const openAudit = openAuditId
    ? (state.audits.find((audit) => audit.id === openAuditId) ?? null)
    : null;

  return openAudit ? (
    <AuditDetail audit={openAudit} onBack={() => setOpenAuditId(null)} />
  ) : (
    <AuditList onOpen={setOpenAuditId} />
  );
}

/* ------------------------------ Audit registry ---------------------------- */

function AuditList({ onOpen }: { onOpen: (auditId: string) => void }) {
  const { state, update } = useQms();
  const { isManager } = useSession();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("Active");
  const [formAudit, setFormAudit] = useState<Audit | null | undefined>(undefined);

  const counts = useMemo(
    () => ({
      All: state.audits.length,
      Active: state.audits.filter((audit) => audit.status === "Active").length,
      Inactive: state.audits.filter((audit) => audit.status === "Inactive").length,
    }),
    [state.audits],
  );

  const rows = useMemo(
    () =>
      state.audits.filter(
        (audit) =>
          (statusFilter === "All" || audit.status === statusFilter) &&
          matchesQuery(
            query,
            audit.processName,
            audit.responsibility,
            audit.clauses.join(" "),
            audit.auditors.join(" "),
          ),
      ),
    [state.audits, statusFilter, query],
  );

  const columns: Array<Column<Audit>> = [
    {
      key: "process",
      header: "Process",
      render: (audit) => <CellStack primary={audit.processName} secondary={audit.responsibility} />,
    },
    {
      key: "clauses",
      header: "Applicable clauses",
      hideBelow: "md",
      render: (audit) => (
        <div className="flex flex-wrap gap-1">
          {audit.clauses.map((clause) => (
            <Badge key={clause} tone="indigo">
              {clause}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "auditors",
      header: "Assigned auditors",
      hideBelow: "lg",
      render: (audit) => <span className="text-sm text-slate-600">{audit.auditors.join(", ")}</span>,
    },
    {
      key: "subProcesses",
      header: "Sub-processes",
      align: "center",
      hideBelow: "md",
      render: (audit) => (
        <span className="text-sm font-semibold text-slate-700">
          {state.subProcesses.filter((subProcess) => subProcess.auditId === audit.id).length}
        </span>
      ),
    },
    {
      key: "date",
      header: "Audit date",
      render: (audit) => <span className="text-sm text-slate-600">{formatDate(audit.auditDate)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (audit) => <StatusBadge status={audit.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (audit) => (
        <RowActions>
          <Button size="sm" variant="secondary" onClick={() => onOpen(audit.id)}>
            Open
          </Button>
          {isManager ? (
            <>
              <IconButton
                label="Edit audit"
                icon={<Pencil className="h-4 w-4" />}
                onClick={() => setFormAudit(audit)}
              />
              <IconButton
                label={audit.status === "Active" ? "Close audit" : "Reopen audit"}
                icon={
                  audit.status === "Active" ? (
                    <ToggleRight className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-slate-400" />
                  )
                }
                onClick={() => {
                  const next: RecordStatus = audit.status === "Active" ? "Inactive" : "Active";
                  update("audits", audit.id, { status: next });
                  toast.push(`${audit.processName} is now ${next.toLowerCase()}.`, "info");
                }}
              />
            </>
          ) : null}
        </RowActions>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Audit registry"
        description="Process audits with responsibility, clauses, inputs, activities, outputs and solid data"
        icon={<ClipboardCheck className="h-4 w-4" />}
        actions={
          isManager ? (
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setFormAudit(null)}>
              Create audit
            </Button>
          ) : null
        }
      />
      <FilterBar>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by process, responsibility, clause or auditor…"
          className="sm:w-96"
        />
        <StatusFilterTabs value={statusFilter} onChange={setStatusFilter} counts={counts} />
      </FilterBar>
      <DataTable
        columns={columns}
        rows={rows}
        onRowClick={(audit) => onOpen(audit.id)}
        emptyTitle="No audits match this filter"
        emptyMessage="Create an audit process such as “Operations Management” to begin."
      />

      {formAudit !== undefined ? (
        <AuditForm audit={formAudit} onClose={() => setFormAudit(undefined)} />
      ) : null}
    </Card>
  );
}

function AuditForm({ audit, onClose }: { audit: Audit | null; onClose: () => void }) {
  const { state, add, update } = useQms();
  const toast = useToast();

  const [form, setForm] = useState({
    processName: audit?.processName ?? "",
    responsibility: audit?.responsibility ?? "",
    clauses: audit?.clauses.join(", ") ?? "",
    inputs: audit?.inputs ?? "",
    activities: audit?.activities ?? "",
    outputs: audit?.outputs ?? "",
    solidData: audit?.solidData ?? "",
    auditors: audit?.auditors ?? [],
    auditDate: audit?.auditDate ?? shiftDays(21),
    status: audit?.status ?? ("Active" as RecordStatus),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.processName.trim()) nextErrors.processName = "Process name is required";
    if (!form.responsibility.trim()) nextErrors.responsibility = "Responsibility is required";
    if (form.auditors.length === 0) nextErrors.auditors = "Assign at least one auditor";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      processName: form.processName.trim(),
      responsibility: form.responsibility.trim(),
      clauses: form.clauses
        .split(",")
        .map((clause) => clause.trim())
        .filter(Boolean),
      inputs: form.inputs.trim(),
      activities: form.activities.trim(),
      outputs: form.outputs.trim(),
      solidData: form.solidData.trim(),
      auditors: form.auditors,
      auditDate: form.auditDate,
      status: form.status,
    };

    if (audit) {
      update("audits", audit.id, payload);
      toast.push(`${payload.processName} updated.`);
    } else {
      add("audits", { id: createId("aud"), createdAt: nowIso(), ...payload });
      toast.push(`Audit “${payload.processName}” created.`);
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={audit ? `Edit ${audit.processName}` : "Create audit"}
      description="These base details are auto-populated into every sub-process created under this audit."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{audit ? "Save changes" : "Create audit"}</Button>
        </>
      }
    >
      <FormGrid>
        <Field label="Process name" required error={errors.processName}>
          <Input
            value={form.processName}
            placeholder="Operations Management"
            onChange={(event) => setForm({ ...form, processName: event.target.value })}
          />
        </Field>
        <Field label="Responsibility" required error={errors.responsibility}>
          <Input
            value={form.responsibility}
            placeholder="Operations Director"
            onChange={(event) => setForm({ ...form, responsibility: event.target.value })}
          />
        </Field>
        <Field label="Applicable clauses" hint="Comma separated, e.g. 4.4, 8.1, 9.1.3">
          <Input
            value={form.clauses}
            placeholder="4.4, 8.1, 9.1.3"
            onChange={(event) => setForm({ ...form, clauses: event.target.value })}
          />
        </Field>
        <Field label="Audit date" required>
          <Input
            type="date"
            value={form.auditDate}
            onChange={(event) => setForm({ ...form, auditDate: event.target.value })}
          />
        </Field>
        <Field label="Inputs" className="sm:col-span-2">
          <Textarea
            rows={2}
            value={form.inputs}
            placeholder="Production plan, resource availability, customer forecast…"
            onChange={(event) => setForm({ ...form, inputs: event.target.value })}
          />
        </Field>
        <Field label="Activities" className="sm:col-span-2">
          <Textarea
            rows={2}
            value={form.activities}
            placeholder="Capacity planning, shift scheduling, in-process monitoring…"
            onChange={(event) => setForm({ ...form, activities: event.target.value })}
          />
        </Field>
        <Field label="Outputs" className="sm:col-span-2">
          <Textarea
            rows={2}
            value={form.outputs}
            placeholder="Released batches, OEE report, deviation log…"
            onChange={(event) => setForm({ ...form, outputs: event.target.value })}
          />
        </Field>
        <Field label="Solid data" hint="Objective records the auditor will sample" className="sm:col-span-2">
          <Textarea
            rows={2}
            value={form.solidData}
            placeholder="OEE dashboard export, shift handover logs, deviation register…"
            onChange={(event) => setForm({ ...form, solidData: event.target.value })}
          />
        </Field>
        <Field label="Assigned auditors" required error={errors.auditors} className="sm:col-span-2">
          <div className="grid gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200 sm:grid-cols-2">
            {state.employees
              .filter((employee) => employee.status === "Active")
              .map((employee) => (
                <Checkbox
                  key={employee.id}
                  label={employee.name}
                  description={employee.jobRole}
                  checked={form.auditors.includes(employee.name)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      auditors: event.target.checked
                        ? [...current.auditors, employee.name]
                        : current.auditors.filter((name) => name !== employee.name),
                    }))
                  }
                />
              ))}
          </div>
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
  );
}

/* ------------------------------- Audit detail ----------------------------- */

function AuditDetail({ audit, onBack }: { audit: Audit; onBack: () => void }) {
  const { state, add, remove } = useQms();
  const { isManager } = useSession();
  const toast = useToast();

  const subProcesses = state.subProcesses.filter((subProcess) => subProcess.auditId === audit.id);
  const [selectedId, setSelectedId] = useState<string | null>(subProcesses[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleting, setDeleting] = useState<AuditSubProcess | null>(null);

  const selected = selectedId
    ? (state.subProcesses.find((subProcess) => subProcess.id === selectedId) ?? null)
    : null;

  const createSubProcess = () => {
    if (!newName.trim()) return;
    const id = createId("sub");
    // Base details flow down from the parent audit so the auditor starts pre-populated.
    add("subProcesses", {
      id,
      auditId: audit.id,
      name: newName.trim(),
      responsibility: audit.responsibility,
      inputs: audit.inputs,
      activities: audit.activities,
      outputs: audit.outputs,
      kpis: [],
      clauseChecks: audit.clauses.map((clause) => ({
        id: createId("clc"),
        clause,
        requirement: "",
        verdict: "Not Applicable" as ComplianceVerdict,
        notes: "",
      })),
      evidence: [],
      evaluation: null,
      createdAt: nowIso(),
    });
    setSelectedId(id);
    setCreating(false);
    setNewName("");
    toast.push(`Sub-process “${newName.trim()}” created with inherited base details.`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={audit.processName}
          description={`Responsibility: ${audit.responsibility} · Audit date ${formatDate(audit.auditDate)}`}
          icon={<ClipboardCheck className="h-4 w-4" />}
          actions={
            <>
              <StatusBadge status={audit.status} />
              <Button
                variant="secondary"
                size="sm"
                icon={<ArrowLeft className="h-3.5 w-3.5" />}
                onClick={onBack}
              >
                Back to registry
              </Button>
            </>
          }
        />
        <CardBody>
          <div className="grid gap-4 lg:grid-cols-2">
            <dl className="divide-y divide-slate-100">
              <DetailRow label="Applicable clauses">
                <div className="flex flex-wrap gap-1">
                  {audit.clauses.map((clause) => (
                    <Badge key={clause} tone="indigo">
                      {clause}
                    </Badge>
                  ))}
                </div>
              </DetailRow>
              <DetailRow label="Assigned auditors">{audit.auditors.join(", ")}</DetailRow>
              <DetailRow label="Inputs">{audit.inputs || "—"}</DetailRow>
            </dl>
            <dl className="divide-y divide-slate-100">
              <DetailRow label="Activities">{audit.activities || "—"}</DetailRow>
              <DetailRow label="Outputs">{audit.outputs || "—"}</DetailRow>
              <DetailRow label="Solid data">{audit.solidData || "—"}</DetailRow>
            </dl>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader
            title="Sub-processes"
            description="Base details inherited from the audit"
            icon={<GitBranch className="h-4 w-4" />}
            actions={
              isManager ? (
                <IconButton
                  label="Add sub-process"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => setCreating(true)}
                />
              ) : null
            }
          />
          {subProcesses.length === 0 ? (
            <EmptyState
              icon={<GitBranch className="h-5 w-5" />}
              title="No sub-processes"
              message="Add a sub-process to run the KPI, evidence and effectiveness stages."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {subProcesses.map((subProcess) => {
                const findings = subProcess.clauseChecks.filter(
                  (check) => check.verdict === "Minor NC" || check.verdict === "Major NC",
                ).length;
                return (
                  <li key={subProcess.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setSelectedId(subProcess.id)}
                      className={cx(
                        "min-w-0 flex-1 px-4 py-3 text-left transition-colors",
                        subProcess.id === selectedId ? "bg-indigo-50/70" : "hover:bg-slate-50",
                      )}
                    >
                      <p className="truncate text-sm font-medium text-slate-900">{subProcess.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        <span>{subProcess.kpis.length} KPIs</span>
                        <span>·</span>
                        <span>{subProcess.evidence.length} evidence</span>
                        {findings > 0 ? (
                          <Badge tone="rose" className="ml-1">
                            {findings} NC
                          </Badge>
                        ) : null}
                        {subProcess.evaluation?.approved ? (
                          <Badge tone="emerald" className="ml-1">
                            Evaluated
                          </Badge>
                        ) : null}
                      </p>
                    </button>
                    {isManager ? (
                      <IconButton
                        label="Delete sub-process"
                        icon={<Trash2 className="h-4 w-4" />}
                        className="mr-2 hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => setDeleting(subProcess)}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {selected ? (
          // Remount on switch so the KPI and evaluation form state follows the selected sub-process.
          <SubProcessExecution key={selected.id} subProcess={selected} />
        ) : (
          <Card>
            <EmptyState
              icon={<GitBranch className="h-5 w-5" />}
              title="Select a sub-process"
              message="Choose a sub-process to work through the execution stages."
            />
          </Card>
        )}
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add sub-process"
        description={`Responsibility, inputs, activities and outputs are copied from “${audit.processName}”.`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={createSubProcess}>Create sub-process</Button>
          </>
        }
      >
        <Field label="Sub-process name" required>
          <Input
            value={newName}
            placeholder="Production Scheduling"
            onChange={(event) => setNewName(event.target.value)}
          />
        </Field>
        <div className="mt-4 space-y-1.5 rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
          <p>
            <span className="font-semibold text-slate-700">Responsibility:</span> {audit.responsibility}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Inputs:</span> {audit.inputs || "—"}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Outputs:</span> {audit.outputs || "—"}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Clause checklist:</span>{" "}
            {audit.clauses.length > 0 ? audit.clauses.join(", ") : "none defined"}
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete sub-process"
        confirmLabel="Delete"
        message={
          <>
            <strong>{deleting?.name}</strong> and its KPIs, evidence and evaluation will be removed.
          </>
        }
        onConfirm={() => {
          if (!deleting) return;
          remove("subProcesses", deleting.id);
          if (selectedId === deleting.id) setSelectedId(null);
          toast.push("Sub-process deleted.", "info");
        }}
      />
    </div>
  );
}

/* --------------------------- Execution stage tabs ------------------------- */

function SubProcessExecution({ subProcess }: { subProcess: AuditSubProcess }) {
  const [tab, setTab] = useState<ExecutionTab>("kpis");

  const findings = subProcess.clauseChecks.filter(
    (check) => check.verdict === "Minor NC" || check.verdict === "Major NC",
  ).length;

  return (
    <Card>
      <CardHeader
        title={subProcess.name}
        description={`Responsibility: ${subProcess.responsibility}`}
        icon={<GitBranch className="h-4 w-4" />}
        actions={
          subProcess.evaluation ? (
            <Badge tone={subProcess.evaluation.approved ? "emerald" : "amber"} dot>
              {subProcess.evaluation.approved ? "Effectiveness approved" : "Evaluation pending approval"}
            </Badge>
          ) : (
            <Badge tone="slate" dot>
              Not evaluated
            </Badge>
          )
        }
      />
      <CardBody className="space-y-3 border-b border-slate-200">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Inputs</p>
            <p className="text-xs text-slate-700">{subProcess.inputs || "—"}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Activities</p>
            <p className="text-xs text-slate-700">{subProcess.activities || "—"}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Outputs</p>
            <p className="text-xs text-slate-700">{subProcess.outputs || "—"}</p>
          </div>
        </div>
        <Tabs
          items={[
            { id: "kpis", label: "1. KPIs", icon: <BarChart3 className="h-3.5 w-3.5" />, count: subProcess.kpis.length },
            {
              id: "evidence",
              label: "2. Evidence & clauses",
              icon: <FileCheck2 className="h-3.5 w-3.5" />,
              count: subProcess.evidence.length,
              badge: findings > 0 ? <Badge tone="rose">{findings} NC</Badge> : undefined,
            },
            { id: "effectiveness", label: "3. Effectiveness", icon: <Gauge className="h-3.5 w-3.5" /> },
          ]}
          value={tab}
          onChange={setTab}
        />
      </CardBody>

      {tab === "kpis" ? <KpiTracker subProcess={subProcess} /> : null}
      {tab === "evidence" ? <EvidenceStage subProcess={subProcess} /> : null}
      {tab === "effectiveness" ? <EffectivenessStage subProcess={subProcess} /> : null}
    </Card>
  );
}

function KpiTracker({ subProcess }: { subProcess: AuditSubProcess }) {
  const { update } = useQms();
  const { isManager } = useSession();
  const toast = useToast();
  const [editing, setEditing] = useState<AuditKpi | null | undefined>(undefined);

  const save = (kpi: AuditKpi) => {
    update("subProcesses", subProcess.id, (current) => ({
      kpis: current.kpis.some((item) => item.id === kpi.id)
        ? current.kpis.map((item) => (item.id === kpi.id ? kpi : item))
        : [...current.kpis, kpi],
    }));
    toast.push(`KPI “${kpi.name}” saved.`);
    setEditing(undefined);
  };

  return (
    <>
      <CardBody className="flex items-center justify-between gap-3 py-3">
        <p className="text-xs text-slate-500">
          Track measured performance against the target agreed with the process owner.
        </p>
        {isManager ? (
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setEditing(null)}>
            Add KPI
          </Button>
        ) : null}
      </CardBody>

      {subProcess.kpis.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-5 w-5" />}
          title="No KPIs defined"
          message="Add the indicators this sub-process is measured on."
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {subProcess.kpis.map((kpi) => {
            // Lower-is-better indicators (time, counts) are met when actual stays under target.
            const lowerIsBetter = kpi.unit !== "%";
            const met = lowerIsBetter ? kpi.actual <= kpi.target : kpi.actual >= kpi.target;
            const attainment = kpi.target
              ? Math.min(
                  100,
                  Math.round(
                    (lowerIsBetter ? kpi.target / Math.max(kpi.actual, 0.0001) : kpi.actual / kpi.target) *
                      100,
                  ),
                )
              : 0;
            return (
              <li key={kpi.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{kpi.name}</p>
                    <Badge tone="slate">{kpi.period}</Badge>
                    <Badge tone={met ? "emerald" : "rose"}>{met ? "Target met" : "Off target"}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Target {kpi.target}
                    {kpi.unit} · Actual {kpi.actual}
                    {kpi.unit}
                  </p>
                  <ProgressBar
                    value={attainment}
                    tone={met ? "emerald" : "rose"}
                    className="mt-2 max-w-sm"
                  />
                </div>
                {isManager ? (
                  <div className="flex items-center gap-1">
                    <IconButton
                      label="Edit KPI"
                      icon={<Pencil className="h-4 w-4" />}
                      onClick={() => setEditing(kpi)}
                    />
                    <IconButton
                      label="Delete KPI"
                      icon={<Trash2 className="h-4 w-4" />}
                      className="hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => {
                        update("subProcesses", subProcess.id, (current) => ({
                          kpis: current.kpis.filter((item) => item.id !== kpi.id),
                        }));
                        toast.push("KPI removed.", "info");
                      }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {editing !== undefined ? (
        <KpiForm kpi={editing} onClose={() => setEditing(undefined)} onSave={save} />
      ) : null}
    </>
  );
}

function KpiForm({
  kpi,
  onClose,
  onSave,
}: {
  kpi: AuditKpi | null;
  onClose: () => void;
  onSave: (kpi: AuditKpi) => void;
}) {
  const [form, setForm] = useState({
    name: kpi?.name ?? "",
    unit: kpi?.unit ?? "%",
    target: String(kpi?.target ?? 95),
    actual: String(kpi?.actual ?? 0),
    period: kpi?.period ?? "Q3",
  });
  const [error, setError] = useState("");

  return (
    <Modal
      open
      onClose={onClose}
      title={kpi ? "Edit KPI" : "Add KPI"}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                setError("KPI name is required");
                return;
              }
              onSave({
                id: kpi?.id ?? createId("kpi"),
                name: form.name.trim(),
                unit: form.unit.trim(),
                target: Number(form.target) || 0,
                actual: Number(form.actual) || 0,
                period: form.period.trim() || "Current",
              });
            }}
          >
            Save KPI
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="KPI name" required error={error}>
          <Input
            value={form.name}
            placeholder="Schedule adherence"
            onChange={(event) => {
              setForm({ ...form, name: event.target.value });
              setError("");
            }}
          />
        </Field>
        <FormGrid>
          <Field label="Target">
            <Input
              type="number"
              step="0.1"
              value={form.target}
              onChange={(event) => setForm({ ...form, target: event.target.value })}
            />
          </Field>
          <Field label="Actual">
            <Input
              type="number"
              step="0.1"
              value={form.actual}
              onChange={(event) => setForm({ ...form, actual: event.target.value })}
            />
          </Field>
          <Field label="Unit" hint="Use % for higher-is-better indicators">
            <Input
              value={form.unit}
              placeholder="%"
              onChange={(event) => setForm({ ...form, unit: event.target.value })}
            />
          </Field>
          <Field label="Period">
            <Input
              value={form.period}
              placeholder="Q3"
              onChange={(event) => setForm({ ...form, period: event.target.value })}
            />
          </Field>
        </FormGrid>
      </div>
    </Modal>
  );
}

function EvidenceStage({ subProcess }: { subProcess: AuditSubProcess }) {
  const { update } = useQms();
  const { isManager, actorName } = useSession();
  const toast = useToast();
  const [newClause, setNewClause] = useState("");

  const setCheck = (id: string, patch: Partial<ClauseCheck>) => {
    update("subProcesses", subProcess.id, (current) => ({
      clauseChecks: current.clauseChecks.map((check) =>
        check.id === id ? { ...check, ...patch } : check,
      ),
    }));
  };

  return (
    <CardBody className="space-y-6">
      <div>
        <SectionLabel>Evidence documents ({subProcess.evidence.length})</SectionLabel>
        <div className="space-y-3">
          <FileUploadZone
            uploadedBy={actorName}
            category="Audit evidence"
            label="Upload audit evidence"
            hint="Reports, logs, screenshots or signed records supporting the clause review."
            onFiles={(documents) => {
              update("subProcesses", subProcess.id, (current) => ({
                evidence: [...current.evidence, ...documents],
              }));
              toast.push(`${documents.length} evidence file(s) uploaded.`);
            }}
          />
          <DocumentList
            documents={subProcess.evidence}
            emptyMessage="No evidence uploaded for this sub-process yet."
            onRemove={(document) =>
              update("subProcesses", subProcess.id, (current) => ({
                evidence: current.evidence.filter((item) => item.id !== document.id),
              }))
            }
          />
        </div>
      </div>

      <div>
        <SectionLabel
          action={
            isManager ? (
              <div className="flex items-center gap-2">
                <div className="w-36">
                  <Input
                    value={newClause}
                    placeholder="Clause e.g. 8.5.1"
                    className="py-1 text-xs"
                    onChange={(event) => setNewClause(event.target.value)}
                  />
                </div>
                <Button
                  size="xs"
                  variant="secondary"
                  icon={<Plus className="h-3 w-3" />}
                  onClick={() => {
                    if (!newClause.trim()) return;
                    update("subProcesses", subProcess.id, (current) => ({
                      clauseChecks: [
                        ...current.clauseChecks,
                        {
                          id: createId("clc"),
                          clause: newClause.trim(),
                          requirement: "",
                          verdict: "Not Applicable" as ComplianceVerdict,
                          notes: "",
                        },
                      ],
                    }));
                    setNewClause("");
                    toast.push("Clause added to the compliance checklist.");
                  }}
                >
                  Add clause
                </Button>
              </div>
            ) : null
          }
        >
          Clause compliance ({subProcess.clauseChecks.length})
        </SectionLabel>

        {subProcess.clauseChecks.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500 ring-1 ring-inset ring-slate-200">
            No clauses on the checklist. Add the clauses this sub-process is assessed against.
          </p>
        ) : (
          <ul className="space-y-3">
            {subProcess.clauseChecks.map((check) => (
              <li key={check.id} className="rounded-xl p-3 ring-1 ring-inset ring-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone="indigo">Clause {check.clause}</Badge>
                    <StatusBadge status={check.verdict} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-40">
                      <Select
                        value={check.verdict}
                        disabled={!isManager}
                        onChange={(event) =>
                          setCheck(check.id, { verdict: event.target.value as ComplianceVerdict })
                        }
                        className="py-1 text-xs"
                      >
                        {verdicts.map((verdict) => (
                          <option key={verdict}>{verdict}</option>
                        ))}
                      </Select>
                    </div>
                    {isManager ? (
                      <IconButton
                        label="Remove clause"
                        icon={<Trash2 className="h-4 w-4" />}
                        className="hover:bg-rose-50 hover:text-rose-600"
                        onClick={() =>
                          update("subProcesses", subProcess.id, (current) => ({
                            clauseChecks: current.clauseChecks.filter((item) => item.id !== check.id),
                          }))
                        }
                      />
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Requirement">
                    <Textarea
                      rows={2}
                      value={check.requirement}
                      disabled={!isManager}
                      placeholder="What the clause requires."
                      onChange={(event) => setCheck(check.id, { requirement: event.target.value })}
                    />
                  </Field>
                  <Field label="Auditor notes">
                    <Textarea
                      rows={2}
                      value={check.notes}
                      disabled={!isManager}
                      placeholder="Observation, sample reviewed and conclusion."
                      onChange={(event) => setCheck(check.id, { notes: event.target.value })}
                    />
                  </Field>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CardBody>
  );
}

function EffectivenessStage({ subProcess }: { subProcess: AuditSubProcess }) {
  const { update } = useQms();
  const { isManager, actorName } = useSession();
  const toast = useToast();

  const [comments, setComments] = useState(subProcess.evaluation?.comments ?? "");
  const [score, setScore] = useState(String(subProcess.evaluation?.score ?? 75));
  const [approved, setApproved] = useState(subProcess.evaluation?.approved ?? false);
  const [error, setError] = useState("");

  const findings = subProcess.clauseChecks.filter(
    (check) => check.verdict === "Minor NC" || check.verdict === "Major NC",
  );
  const kpisMet = subProcess.kpis.filter((kpi) =>
    kpi.unit === "%" ? kpi.actual >= kpi.target : kpi.actual <= kpi.target,
  ).length;

  const save = () => {
    if (!comments.trim()) {
      setError("Record your effectiveness conclusion before saving.");
      return;
    }
    update("subProcesses", subProcess.id, {
      evaluation: {
        comments: comments.trim(),
        score: Number(score) || 0,
        approved,
        evaluatedBy: actorName,
        evaluatedAt: nowIso(),
      },
    });
    toast.push(
      approved ? "Process effectiveness approved." : "Evaluation saved without approval.",
      approved ? "success" : "warning",
    );
  };

  return (
    <CardBody className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">KPIs on target</p>
          <p className="text-lg font-semibold text-slate-900">
            {kpisMet}/{subProcess.kpis.length}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Non-conformities</p>
          <p className="text-lg font-semibold text-slate-900">{findings.length}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Evidence files</p>
          <p className="text-lg font-semibold text-slate-900">{subProcess.evidence.length}</p>
        </div>
      </div>

      {subProcess.evaluation ? (
        <div
          className={cx(
            "rounded-xl px-3.5 py-3 text-xs ring-1 ring-inset",
            subProcess.evaluation.approved
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
              : "bg-amber-50 text-amber-800 ring-amber-200",
          )}
        >
          <p className="font-semibold">
            {subProcess.evaluation.approved ? "Approved" : "Saved, not approved"} · score{" "}
            {subProcess.evaluation.score}%
          </p>
          <p className="mt-0.5">
            {subProcess.evaluation.evaluatedBy} · {formatDateTime(subProcess.evaluation.evaluatedAt)}
          </p>
        </div>
      ) : null}

      {isManager ? (
        <div className="space-y-4">
          <Field
            label="Process effectiveness comments"
            required
            error={error}
            hint="Summarise whether the sub-process achieves its intended results."
          >
            <Textarea
              rows={4}
              value={comments}
              placeholder="Monitoring is effective; two ageing deviations need a closure plan before the next cycle."
              onChange={(event) => {
                setComments(event.target.value);
                setError("");
              }}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Approval score — ${score}%`}>
              <input
                type="range"
                min={0}
                max={100}
                value={score}
                onChange={(event) => setScore(event.target.value)}
                className="mt-2 w-full accent-indigo-600"
              />
              <ProgressBar
                value={Number(score)}
                tone={Number(score) >= 75 ? "emerald" : Number(score) >= 50 ? "amber" : "rose"}
                className="mt-2"
              />
            </Field>
            <div className="flex items-end">
              <Checkbox
                label="Approve process effectiveness"
                description="Confirms the sub-process is effective for this audit cycle."
                checked={approved}
                onChange={(event) => setApproved(event.target.checked)}
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-200 pt-4">
            <Button onClick={save} icon={<Gauge className="h-4 w-4" />}>
              Save evaluation
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500 ring-1 ring-inset ring-slate-200">
          {subProcess.evaluation?.comments ??
            "No evaluation recorded yet. Managers and System Admins can complete this stage."}
        </p>
      )}
    </CardBody>
  );
}

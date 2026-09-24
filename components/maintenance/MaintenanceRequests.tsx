"use client";

import { ClipboardList, Eye, Pencil, Plus, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { useQms, useSession } from "@/lib/store";
import type {
  MaintenanceRequest,
  MaintenanceRequestStatus,
  MaintenanceType,
} from "@/lib/types";
import { createId, dueLabel, formatDate, matchesQuery, nowIso, todayIso } from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CellStack, DataTable, RowActions, type Column } from "@/components/ui/DataTable";
import { DetailRow, DocumentList, FileUploadZone, SectionLabel } from "@/components/ui/Documents";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { FilterBar, SearchInput } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";

const types: MaintenanceType[] = ["Preventive", "Routine", "Corrective", "Calibration"];
const statuses: MaintenanceRequestStatus[] = ["Open", "In Progress", "Completed", "Cancelled"];

interface RequestForm {
  assetId: string;
  type: MaintenanceType;
  technician: string;
  scheduledDate: string;
  completedDate: string;
  description: string;
  findings: string;
  downtimeHours: string;
  status: MaintenanceRequestStatus;
}

const blankForm = (assetId = ""): RequestForm => ({
  assetId,
  type: "Preventive",
  technician: "",
  scheduledDate: todayIso(),
  completedDate: "",
  description: "",
  findings: "",
  downtimeHours: "",
  status: "Open",
});

export function MaintenanceRequests() {
  const { state, add, update } = useQms();
  const { isManager, actorName } = useSession();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MaintenanceRequestStatus | "All">("All");
  const [typeFilter, setTypeFilter] = useState<MaintenanceType | "All">("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRequest | null>(null);
  const [form, setForm] = useState<RequestForm>(blankForm);
  const [errors, setErrors] = useState<Partial<Record<keyof RequestForm, string>>>({});
  const [viewingId, setViewingId] = useState<string | null>(null);

  const activeAssets = state.assets.filter((asset) => asset.status === "Active");

  const rows = useMemo(
    () =>
      state.maintenanceRequests.filter((request) => {
        const asset = state.assets.find((item) => item.id === request.assetId);
        return (
          (statusFilter === "All" || request.status === statusFilter) &&
          (typeFilter === "All" || request.type === typeFilter) &&
          matchesQuery(
            query,
            asset?.name,
            asset?.serialNumber,
            request.description,
            request.technician,
            request.raisedBy,
          )
        );
      }),
    [state.maintenanceRequests, state.assets, statusFilter, typeFilter, query],
  );

  const viewing = viewingId
    ? (state.maintenanceRequests.find((request) => request.id === viewingId) ?? null)
    : null;

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm(activeAssets[0]?.id ?? ""));
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (request: MaintenanceRequest) => {
    setEditing(request);
    setForm({
      assetId: request.assetId,
      type: request.type,
      technician: request.technician,
      scheduledDate: request.scheduledDate,
      completedDate: request.completedDate ?? "",
      description: request.description,
      findings: request.findings ?? "",
      downtimeHours: request.downtimeHours ? String(request.downtimeHours) : "",
      status: request.status,
    });
    setErrors({});
    setFormOpen(true);
  };

  const submit = () => {
    const nextErrors: Partial<Record<keyof RequestForm, string>> = {};
    if (!form.assetId) nextErrors.assetId = "Select the asset this request is for";
    if (!form.description.trim()) nextErrors.description = "Describe the work to be performed";
    if (!form.technician.trim()) nextErrors.technician = "Assign a technician or vendor";
    if (form.status === "Completed" && !form.completedDate)
      nextErrors.completedDate = "Completed requests need a completion date";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      assetId: form.assetId,
      type: form.type,
      technician: form.technician.trim(),
      scheduledDate: form.scheduledDate,
      completedDate: form.completedDate || undefined,
      description: form.description.trim(),
      findings: form.findings.trim() || undefined,
      downtimeHours: form.downtimeHours ? Number(form.downtimeHours) : undefined,
      status: form.status,
    };

    if (editing) {
      update("maintenanceRequests", editing.id, payload);
      toast.push("Maintenance request updated.");
    } else {
      add("maintenanceRequests", {
        id: createId("mrq"),
        raisedBy: actorName,
        createdAt: nowIso(),
        documents: [],
        ...payload,
      });
      toast.push("Maintenance request logged.");
    }

    // Keep the asset card in sync with the latest work order state.
    if (form.status === "In Progress") {
      update("assets", form.assetId, { maintenanceState: "In Progress" });
    } else if (form.status === "Completed") {
      update("assets", form.assetId, { maintenanceState: "Completed" });
    }

    setFormOpen(false);
  };

  const columns: Array<Column<MaintenanceRequest>> = [
    {
      key: "asset",
      header: "Asset",
      render: (request) => {
        const asset = state.assets.find((item) => item.id === request.assetId);
        return <CellStack primary={asset?.name ?? "Unknown asset"} secondary={asset?.serialNumber} />;
      },
    },
    {
      key: "type",
      header: "Type",
      render: (request) => <Badge tone="indigo">{request.type}</Badge>,
    },
    {
      key: "description",
      header: "Scope",
      hideBelow: "lg",
      render: (request) => (
        <p className="max-w-sm truncate text-sm text-slate-600">{request.description}</p>
      ),
    },
    {
      key: "technician",
      header: "Technician",
      hideBelow: "md",
      render: (request) => <span className="text-sm text-slate-600">{request.technician}</span>,
    },
    {
      key: "scheduled",
      header: "Scheduled",
      render: (request) => (
        <div className="text-xs">
          <p className="font-medium text-slate-800">{formatDate(request.scheduledDate)}</p>
          <p className="text-slate-400">
            {request.status === "Completed"
              ? `Closed ${formatDate(request.completedDate)}`
              : dueLabel(request.scheduledDate)}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (request) => <StatusBadge status={request.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (request) => (
        <RowActions>
          <IconButton
            label="View request"
            icon={<Eye className="h-4 w-4" />}
            onClick={() => setViewingId(request.id)}
          />
          {isManager ? (
            <IconButton
              label="Edit request"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => openEdit(request)}
            />
          ) : null}
        </RowActions>
      ),
    },
  ];

  const viewingAsset = viewing ? state.assets.find((asset) => asset.id === viewing.assetId) : undefined;

  return (
    <Card>
      <CardHeader
        title="Maintenance workflow"
        description="Log routine, preventive, corrective and calibration work with inspection records"
        icon={<Wrench className="h-4 w-4" />}
        actions={
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Log maintenance request
          </Button>
        }
      />
      <FilterBar>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by asset, scope or technician…"
          className="sm:w-80"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-40">
            <Select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as MaintenanceType | "All")}
            >
              <option value="All">All types</option>
              {types.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as MaintenanceRequestStatus | "All")}
            >
              <option value="All">All statuses</option>
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </Select>
          </div>
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        emptyTitle="No maintenance requests match this filter"
        emptyMessage="Log a request to start tracking preventive or corrective work."
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit maintenance request" : "Log maintenance request"}
        description="Completing a request updates the maintenance status shown on the asset record."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>{editing ? "Save changes" : "Log request"}</Button>
          </>
        }
      >
        <FormGrid>
          <Field label="Asset" required error={errors.assetId} className="sm:col-span-2">
            <Select
              value={form.assetId}
              onChange={(event) => setForm({ ...form, assetId: event.target.value })}
            >
              <option value="">Select an asset…</option>
              {activeAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.serialNumber} — {asset.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Maintenance type" required>
            <Select
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value as MaintenanceType })}
            >
              {types.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </Select>
          </Field>
          <Field label="Technician / vendor" required error={errors.technician}>
            <Input
              value={form.technician}
              placeholder="Tobias Krause"
              onChange={(event) => setForm({ ...form, technician: event.target.value })}
            />
          </Field>
          <Field label="Scheduled date" required>
            <Input
              type="date"
              value={form.scheduledDate}
              onChange={(event) => setForm({ ...form, scheduledDate: event.target.value })}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as MaintenanceRequestStatus })
              }
            >
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </Select>
          </Field>
          <Field label="Completion date" error={errors.completedDate}>
            <Input
              type="date"
              value={form.completedDate}
              onChange={(event) => setForm({ ...form, completedDate: event.target.value })}
            />
          </Field>
          <Field label="Downtime (hours)">
            <Input
              type="number"
              min={0}
              step={0.5}
              value={form.downtimeHours}
              onChange={(event) => setForm({ ...form, downtimeHours: event.target.value })}
            />
          </Field>
          <Field label="Scope of work" required error={errors.description} className="sm:col-span-2">
            <Textarea
              rows={3}
              value={form.description}
              placeholder="Quarterly chamber gasket inspection and vacuum leak test."
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>
          <Field label="Findings / actions taken" className="sm:col-span-2">
            <Textarea
              rows={3}
              value={form.findings}
              placeholder="Record observations, parts replaced and follow-up actions."
              onChange={(event) => setForm({ ...form, findings: event.target.value })}
            />
          </Field>
        </FormGrid>
      </Modal>

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewingId(null)}
        title={viewing ? `${viewing.type} maintenance` : ""}
        description={viewingAsset ? `${viewingAsset.name} · ${viewingAsset.serialNumber}` : undefined}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setViewingId(null)}>
            Close
          </Button>
        }
      >
        {viewing ? (
          <div className="space-y-5">
            <dl className="divide-y divide-slate-100">
              <DetailRow label="Status">
                <StatusBadge status={viewing.status} />
              </DetailRow>
              <DetailRow label="Raised by">{viewing.raisedBy}</DetailRow>
              <DetailRow label="Technician">{viewing.technician}</DetailRow>
              <DetailRow label="Scheduled">{formatDate(viewing.scheduledDate)}</DetailRow>
              <DetailRow label="Completed">{formatDate(viewing.completedDate)}</DetailRow>
              <DetailRow label="Downtime">
                {viewing.downtimeHours ? `${viewing.downtimeHours} h` : "—"}
              </DetailRow>
              <DetailRow label="Scope">{viewing.description}</DetailRow>
              <DetailRow label="Findings">{viewing.findings ?? "—"}</DetailRow>
            </dl>

            <div>
              <SectionLabel
                action={
                  <FileUploadZone
                    compact
                    label="Attach record"
                    uploadedBy={actorName}
                    category={`${viewing.type} record`}
                    onFiles={(documents) => {
                      update("maintenanceRequests", viewing.id, (current) => ({
                        documents: [...current.documents, ...documents],
                      }));
                      update("assets", viewing.assetId, (current) => ({
                        documents: [...current.documents, ...documents],
                      }));
                      toast.push("Record attached to the request and the asset file.");
                    }}
                  />
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Inspection / maintenance records ({viewing.documents.length})
                </span>
              </SectionLabel>
              <DocumentList
                documents={viewing.documents}
                emptyMessage="No inspection or maintenance records attached to this request yet."
                onRemove={(document) =>
                  update("maintenanceRequests", viewing.id, (current) => ({
                    documents: current.documents.filter((item) => item.id !== document.id),
                  }))
                }
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </Card>
  );
}

"use client";

import { Eye, HardDrive, Pencil, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useQms, useSession } from "@/lib/store";
import type { Asset, MaintenanceState, RecordStatus, TrainingFrequency } from "@/lib/types";
import { createId, dueLabel, formatDate, matchesQuery, nowIso, shiftDays, todayIso } from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CellStack, DataTable, RowActions, type Column } from "@/components/ui/DataTable";
import { DetailRow, DocumentList, FileUploadZone, SectionLabel } from "@/components/ui/Documents";
import { Field, FormGrid, Input, Select } from "@/components/ui/Form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { FilterBar, SearchInput, StatusFilterTabs, type StatusFilterValue } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";

const categories = ["Sterilization", "Production", "Facilities", "Laboratory", "Utilities", "IT"];
const frequencies: TrainingFrequency[] = ["Monthly", "Quarterly", "Half-Yearly", "Annual", "One-Time"];
const maintenanceStates: MaintenanceState[] = [
  "Scheduled",
  "Due Soon",
  "Overdue",
  "In Progress",
  "Completed",
];

interface AssetForm {
  serialNumber: string;
  name: string;
  category: string;
  location: string;
  manufacturer: string;
  ppmStartDate: string;
  dueDate: string;
  frequency: TrainingFrequency;
  maintenanceState: MaintenanceState;
  status: RecordStatus;
}

const blankForm = (): AssetForm => ({
  serialNumber: "",
  name: "",
  category: categories[0],
  location: "",
  manufacturer: "",
  ppmStartDate: todayIso(),
  dueDate: shiftDays(90),
  frequency: "Quarterly",
  maintenanceState: "Scheduled",
  status: "Active",
});

export function AssetRegistry() {
  const { state, add, update } = useQms();
  const { isManager, actorName } = useSession();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("Active");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState<AssetForm>(blankForm);
  const [errors, setErrors] = useState<Partial<Record<keyof AssetForm, string>>>({});
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<Asset | null>(null);

  const counts = useMemo(
    () => ({
      All: state.assets.length,
      Active: state.assets.filter((asset) => asset.status === "Active").length,
      Inactive: state.assets.filter((asset) => asset.status === "Inactive").length,
    }),
    [state.assets],
  );

  const rows = useMemo(
    () =>
      state.assets.filter(
        (asset) =>
          (statusFilter === "All" || asset.status === statusFilter) &&
          matchesQuery(
            query,
            asset.name,
            asset.serialNumber,
            asset.category,
            asset.location,
            asset.manufacturer,
            asset.maintenanceState,
          ),
      ),
    [state.assets, statusFilter, query],
  );

  const viewing = viewingId ? (state.assets.find((asset) => asset.id === viewingId) ?? null) : null;

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm());
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditing(asset);
    setForm({
      serialNumber: asset.serialNumber,
      name: asset.name,
      category: asset.category,
      location: asset.location,
      manufacturer: asset.manufacturer,
      ppmStartDate: asset.ppmStartDate,
      dueDate: asset.dueDate,
      frequency: asset.frequency,
      maintenanceState: asset.maintenanceState,
      status: asset.status,
    });
    setErrors({});
    setFormOpen(true);
  };

  const submit = () => {
    const nextErrors: Partial<Record<keyof AssetForm, string>> = {};
    if (!form.serialNumber.trim()) nextErrors.serialNumber = "Machine serial number is required";
    if (!form.name.trim()) nextErrors.name = "Asset name is required";
    if (!form.location.trim()) nextErrors.location = "Location is required";
    if (form.dueDate < form.ppmStartDate) nextErrors.dueDate = "Due date must follow the PPM start date";
    const duplicate = state.assets.find(
      (asset) =>
        asset.serialNumber.toLowerCase() === form.serialNumber.trim().toLowerCase() &&
        asset.id !== editing?.id,
    );
    if (duplicate) nextErrors.serialNumber = "This serial number is already registered";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      serialNumber: form.serialNumber.trim().toUpperCase(),
      name: form.name.trim(),
      category: form.category,
      location: form.location.trim(),
      manufacturer: form.manufacturer.trim(),
      ppmStartDate: form.ppmStartDate,
      dueDate: form.dueDate,
      frequency: form.frequency,
      maintenanceState: form.maintenanceState,
      status: form.status,
    };

    if (editing) {
      update("assets", editing.id, payload);
      toast.push(`${payload.name} updated.`);
    } else {
      add("assets", { id: createId("ast"), createdAt: nowIso(), documents: [], ...payload });
      toast.push(`${payload.name} registered.`);
    }
    setFormOpen(false);
  };

  const columns: Array<Column<Asset>> = [
    {
      key: "asset",
      header: "Asset",
      render: (asset) => <CellStack primary={asset.name} secondary={asset.serialNumber} />,
    },
    {
      key: "category",
      header: "Category",
      hideBelow: "md",
      render: (asset) => <Badge tone="slate">{asset.category}</Badge>,
    },
    {
      key: "location",
      header: "Location",
      hideBelow: "lg",
      render: (asset) => <span className="text-sm text-slate-600">{asset.location}</span>,
    },
    {
      key: "ppm",
      header: "PPM window",
      hideBelow: "xl",
      render: (asset) => (
        <span className="text-xs text-slate-600">
          {formatDate(asset.ppmStartDate)} → {formatDate(asset.dueDate)}
        </span>
      ),
    },
    {
      key: "due",
      header: "Next due",
      render: (asset) => (
        <div className="text-xs">
          <p className="font-medium text-slate-800">{formatDate(asset.dueDate)}</p>
          <p className="text-slate-400">{dueLabel(asset.dueDate)}</p>
        </div>
      ),
    },
    {
      key: "state",
      header: "Maintenance",
      render: (asset) => <StatusBadge status={asset.maintenanceState} />,
    },
    {
      key: "docs",
      header: "Files",
      align: "center",
      hideBelow: "md",
      render: (asset) => (
        <span className="text-sm font-semibold text-slate-700">{asset.documents.length}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (asset) => <StatusBadge status={asset.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (asset) => (
        <RowActions>
          <IconButton
            label={`View ${asset.name}`}
            icon={<Eye className="h-4 w-4" />}
            onClick={() => setViewingId(asset.id)}
          />
          {isManager ? (
            <>
              <IconButton
                label={`Edit ${asset.name}`}
                icon={<Pencil className="h-4 w-4" />}
                onClick={() => openEdit(asset)}
              />
              <IconButton
                label={asset.status === "Active" ? "Decommission asset" : "Reactivate asset"}
                icon={
                  asset.status === "Active" ? (
                    <ToggleRight className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-slate-400" />
                  )
                }
                onClick={() => setToggling(asset)}
              />
            </>
          ) : null}
        </RowActions>
      ),
    },
  ];

  const viewingRequests = viewing
    ? state.maintenanceRequests.filter((request) => request.assetId === viewing.id)
    : [];

  return (
    <Card>
      <CardHeader
        title="Asset / machine registry"
        description="Equipment master data with PPM schedule, maintenance state and attachments"
        icon={<HardDrive className="h-4 w-4" />}
        actions={
          isManager ? (
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Register asset
            </Button>
          ) : null
        }
      />
      <FilterBar>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by serial number, name, category or location…"
          className="sm:w-96"
        />
        <StatusFilterTabs value={statusFilter} onChange={setStatusFilter} counts={counts} />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        emptyTitle="No assets match this filter"
        emptyMessage="Register equipment to start scheduling preventive maintenance."
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Register asset"}
        description="The PPM start date and due date drive reminder alerts and the maintenance dashboard."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>{editing ? "Save changes" : "Register asset"}</Button>
          </>
        }
      >
        <FormGrid>
          <Field label="Machine serial number" required error={errors.serialNumber}>
            <Input
              value={form.serialNumber}
              placeholder="MCH-AC-8842"
              onChange={(event) => setForm({ ...form, serialNumber: event.target.value })}
            />
          </Field>
          <Field label="Asset name" required error={errors.name}>
            <Input
              value={form.name}
              placeholder="Autoclave Sterilizer A2"
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="Category">
            <Select
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </Select>
          </Field>
          <Field label="Manufacturer">
            <Input
              value={form.manufacturer}
              placeholder="SteriTech"
              onChange={(event) => setForm({ ...form, manufacturer: event.target.value })}
            />
          </Field>
          <Field label="Location" required error={errors.location} className="sm:col-span-2">
            <Input
              value={form.location}
              placeholder="Block B / Clean Room 2"
              onChange={(event) => setForm({ ...form, location: event.target.value })}
            />
          </Field>
          <Field label="PPM start date" required>
            <Input
              type="date"
              value={form.ppmStartDate}
              onChange={(event) => setForm({ ...form, ppmStartDate: event.target.value })}
            />
          </Field>
          <Field label="Due date" required error={errors.dueDate}>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            />
          </Field>
          <Field label="PPM frequency">
            <Select
              value={form.frequency}
              onChange={(event) =>
                setForm({ ...form, frequency: event.target.value as TrainingFrequency })
              }
            >
              {frequencies.map((frequency) => (
                <option key={frequency}>{frequency}</option>
              ))}
            </Select>
          </Field>
          <Field label="Maintenance status">
            <Select
              value={form.maintenanceState}
              onChange={(event) =>
                setForm({ ...form, maintenanceState: event.target.value as MaintenanceState })
              }
            >
              {maintenanceStates.map((maintenanceState) => (
                <option key={maintenanceState}>{maintenanceState}</option>
              ))}
            </Select>
          </Field>
          <Field label="Record status">
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
        onClose={() => setViewingId(null)}
        title={viewing?.name ?? ""}
        description={viewing ? `${viewing.serialNumber} · ${viewing.manufacturer}` : undefined}
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
              <DetailRow label="Category">{viewing.category}</DetailRow>
              <DetailRow label="Location">{viewing.location}</DetailRow>
              <DetailRow label="PPM window">
                {formatDate(viewing.ppmStartDate)} → {formatDate(viewing.dueDate)} (
                {dueLabel(viewing.dueDate)})
              </DetailRow>
              <DetailRow label="Frequency">{viewing.frequency}</DetailRow>
              <DetailRow label="Maintenance status">
                <StatusBadge status={viewing.maintenanceState} />
              </DetailRow>
              <DetailRow label="Record status">
                <StatusBadge status={viewing.status} />
              </DetailRow>
            </dl>

            <div>
              <SectionLabel
                action={
                  isManager ? (
                    <FileUploadZone
                      compact
                      label="Attach file"
                      uploadedBy={actorName}
                      category="Equipment record"
                      onFiles={(documents) => {
                        update("assets", viewing.id, (current) => ({
                          documents: [...current.documents, ...documents],
                        }));
                        toast.push(`${documents.length} file(s) attached to ${viewing.name}.`);
                      }}
                    />
                  ) : null
                }
              >
                Attachments ({viewing.documents.length})
              </SectionLabel>
              <DocumentList
                documents={viewing.documents}
                emptyMessage="No inspection or maintenance records attached to this asset yet."
                onRemove={
                  isManager
                    ? (document) =>
                        update("assets", viewing.id, (current) => ({
                          documents: current.documents.filter((item) => item.id !== document.id),
                        }))
                    : undefined
                }
              />
            </div>

            <div>
              <SectionLabel>Maintenance history ({viewingRequests.length})</SectionLabel>
              {viewingRequests.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500 ring-1 ring-inset ring-slate-200">
                  No maintenance requests logged against this asset.
                </p>
              ) : (
                <ul className="space-y-2">
                  {viewingRequests.map((request) => (
                    <li
                      key={request.id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 ring-1 ring-inset ring-slate-200"
                    >
                      <Badge tone="indigo">{request.type}</Badge>
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-700">
                        {request.description}
                      </span>
                      <span className="hidden shrink-0 text-xs text-slate-500 sm:block">
                        {formatDate(request.scheduledDate)}
                      </span>
                      <StatusBadge status={request.status} />
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
        title={toggling?.status === "Active" ? "Decommission asset" : "Reactivate asset"}
        tone={toggling?.status === "Active" ? "danger" : "primary"}
        confirmLabel={toggling?.status === "Active" ? "Decommission" : "Reactivate"}
        message={
          <>
            <strong>{toggling?.name}</strong>{" "}
            {toggling?.status === "Active"
              ? "will be marked inactive and excluded from PPM reminders."
              : "will re-enter the preventive maintenance schedule."}
          </>
        }
        onConfirm={() => {
          if (!toggling) return;
          const next: RecordStatus = toggling.status === "Active" ? "Inactive" : "Active";
          update("assets", toggling.id, { status: next });
          toast.push(`${toggling.name} is now ${next.toLowerCase()}.`, "info");
        }}
      />
    </Card>
  );
}

"use client";

import {
  Eye,
  Mail,
  Pencil,
  Phone,
  Plus,
  Star,
  ToggleLeft,
  ToggleRight,
  Truck,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQms, useSession } from "@/lib/store";
import type { RecordStatus, Supplier } from "@/lib/types";
import { createId, daysUntil, dueLabel, formatDate, matchesQuery, nowIso, shiftDays } from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { CellStack, DataTable, RowActions, type Column } from "@/components/ui/DataTable";
import { DetailRow } from "@/components/ui/Documents";
import { Field, FormGrid, Input, Select } from "@/components/ui/Form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar, SearchInput, StatusFilterTabs, type StatusFilterValue } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";

const departments = [
  "Procurement",
  "Quality Control",
  "Quality Assurance",
  "Engineering",
  "Facilities",
  "Warehouse",
  "Operations",
];

interface SupplierForm {
  name: string;
  department: string;
  serviceSupplied: boolean;
  contactPerson: string;
  phone: string;
  email: string;
  dueDate: string;
  rating: string;
  status: RecordStatus;
}

const blankForm = (): SupplierForm => ({
  name: "",
  department: departments[0],
  serviceSupplied: true,
  contactPerson: "",
  phone: "",
  email: "",
  dueDate: shiftDays(180),
  rating: "4",
  status: "Active",
});

export default function SuppliersPage() {
  const { state, add, update } = useQms();
  const { isManager } = useSession();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("Active");
  const [serviceFilter, setServiceFilter] = useState<"All" | "Yes" | "No">("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierForm>(blankForm);
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierForm, string>>>({});
  const [viewing, setViewing] = useState<Supplier | null>(null);
  const [toggling, setToggling] = useState<Supplier | null>(null);

  const counts = useMemo(
    () => ({
      All: state.suppliers.length,
      Active: state.suppliers.filter((supplier) => supplier.status === "Active").length,
      Inactive: state.suppliers.filter((supplier) => supplier.status === "Inactive").length,
    }),
    [state.suppliers],
  );

  const rows = useMemo(
    () =>
      state.suppliers.filter(
        (supplier) =>
          (statusFilter === "All" || supplier.status === statusFilter) &&
          (serviceFilter === "All" || (serviceFilter === "Yes") === supplier.serviceSupplied) &&
          matchesQuery(
            query,
            supplier.name,
            supplier.department,
            supplier.contactPerson,
            supplier.phone,
            supplier.email,
          ),
      ),
    [state.suppliers, statusFilter, serviceFilter, query],
  );

  const activeSuppliers = state.suppliers.filter((supplier) => supplier.status === "Active");
  const requalificationDue = activeSuppliers.filter((supplier) => daysUntil(supplier.dueDate) <= 30);
  const serviceProviders = activeSuppliers.filter((supplier) => supplier.serviceSupplied);
  const averageRating = activeSuppliers.length
    ? (
        activeSuppliers.reduce((sum, supplier) => sum + supplier.rating, 0) / activeSuppliers.length
      ).toFixed(1)
    : "—";

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm());
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setForm({
      name: supplier.name,
      department: supplier.department,
      serviceSupplied: supplier.serviceSupplied,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      dueDate: supplier.dueDate,
      rating: String(supplier.rating),
      status: supplier.status,
    });
    setErrors({});
    setFormOpen(true);
  };

  const submit = () => {
    const nextErrors: Partial<Record<keyof SupplierForm, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Supplier name is required";
    if (!form.phone.trim()) nextErrors.phone = "Phone number is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      nextErrors.email = "Enter a valid email";
    const duplicate = state.suppliers.find(
      (supplier) =>
        supplier.name.trim().toLowerCase() === form.name.trim().toLowerCase() &&
        supplier.id !== editing?.id,
    );
    if (duplicate) nextErrors.name = "A supplier with this name already exists";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      name: form.name.trim(),
      department: form.department,
      serviceSupplied: form.serviceSupplied,
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      dueDate: form.dueDate,
      rating: Number(form.rating) || 0,
      status: form.status,
    };

    if (editing) {
      update("suppliers", editing.id, payload);
      toast.push(`${payload.name} updated.`);
    } else {
      add("suppliers", { id: createId("sup"), createdAt: nowIso(), ...payload });
      toast.push(`${payload.name} added to the vendor registry.`);
    }
    setFormOpen(false);
  };

  const columns: Array<Column<Supplier>> = [
    {
      key: "supplier",
      header: "Supplier",
      render: (supplier) => <CellStack primary={supplier.name} secondary={supplier.contactPerson} />,
    },
    {
      key: "department",
      header: "Department",
      render: (supplier) => <span className="text-sm">{supplier.department}</span>,
    },
    {
      key: "service",
      header: "Service supplied",
      align: "center",
      render: (supplier) => (
        <Badge tone={supplier.serviceSupplied ? "teal" : "slate"}>
          {supplier.serviceSupplied ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "phone",
      header: "Phone number",
      hideBelow: "md",
      render: (supplier) => <span className="text-sm text-slate-600">{supplier.phone}</span>,
    },
    {
      key: "due",
      header: "Due date",
      render: (supplier) => (
        <div className="text-xs">
          <p className="font-medium text-slate-800">{formatDate(supplier.dueDate)}</p>
          <p className={daysUntil(supplier.dueDate) < 0 ? "text-rose-500" : "text-slate-400"}>
            {dueLabel(supplier.dueDate)}
          </p>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      hideBelow: "lg",
      render: (supplier) => (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-700">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {supplier.rating.toFixed(1)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (supplier) => <StatusBadge status={supplier.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (supplier) => (
        <RowActions>
          <IconButton
            label={`View ${supplier.name}`}
            icon={<Eye className="h-4 w-4" />}
            onClick={() => setViewing(supplier)}
          />
          {isManager ? (
            <>
              <IconButton
                label={`Edit ${supplier.name}`}
                icon={<Pencil className="h-4 w-4" />}
                onClick={() => openEdit(supplier)}
              />
              <IconButton
                label={supplier.status === "Active" ? "Deactivate supplier" : "Reactivate supplier"}
                icon={
                  supplier.status === "Active" ? (
                    <ToggleRight className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-slate-400" />
                  )
                }
                onClick={() => setToggling(supplier)}
              />
            </>
          ) : null}
        </RowActions>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Supplier management"
        description="Approved vendor registry with service classification and re-qualification tracking."
        actions={
          isManager ? (
            <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Add supplier
            </Button>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Active suppliers"
          value={activeSuppliers.length}
          hint={`${counts.Inactive} inactive`}
          icon={<Truck className="h-5 w-5" />}
        />
        <StatTile
          label="Service providers"
          value={serviceProviders.length}
          hint="Flagged as service supplied"
          tone="sky"
          icon={<Wrench className="h-5 w-5" />}
        />
        <StatTile
          label="Re-qualification due"
          value={requalificationDue.length}
          hint="Within the next 30 days"
          tone="amber"
          icon={<Star className="h-5 w-5" />}
        />
        <StatTile
          label="Average rating"
          value={averageRating}
          hint="Across active vendors"
          tone="emerald"
          icon={<Star className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader
          title="Vendor registry"
          description="Search, filter and maintain supplier master data"
          icon={<Truck className="h-4 w-4" />}
        />
        <FilterBar>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by supplier, department, contact or phone…"
            className="sm:w-96"
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
              <Select
                value={serviceFilter}
                onChange={(event) => setServiceFilter(event.target.value as "All" | "Yes" | "No")}
              >
                <option value="All">Service &amp; goods</option>
                <option value="Yes">Service supplied</option>
                <option value="No">Goods only</option>
              </Select>
            </div>
            <StatusFilterTabs value={statusFilter} onChange={setStatusFilter} counts={counts} />
          </div>
        </FilterBar>

        <DataTable
          columns={columns}
          rows={rows}
          emptyTitle="No suppliers match this filter"
          emptyMessage="Adjust the search or add a new vendor to the registry."
        />
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Add supplier"}
        description="The due date is the next re-qualification or contract review checkpoint."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>{editing ? "Save changes" : "Add supplier"}</Button>
          </>
        }
      >
        <FormGrid>
          <Field label="Supplier name" required error={errors.name} className="sm:col-span-2">
            <Input
              value={form.name}
              placeholder="Apex Calibration Co."
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="Department">
            <Select
              value={form.department}
              onChange={(event) => setForm({ ...form, department: event.target.value })}
            >
              {departments.map((department) => (
                <option key={department}>{department}</option>
              ))}
            </Select>
          </Field>
          <Field label="Service supplied" hint="Yes for services, No for goods only">
            <Select
              value={form.serviceSupplied ? "Yes" : "No"}
              onChange={(event) => setForm({ ...form, serviceSupplied: event.target.value === "Yes" })}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </Select>
          </Field>
          <Field label="Contact person">
            <Input
              value={form.contactPerson}
              placeholder="Suresh Menon"
              onChange={(event) => setForm({ ...form, contactPerson: event.target.value })}
            />
          </Field>
          <Field label="Phone number" required error={errors.phone}>
            <Input
              value={form.phone}
              placeholder="+91 98200 44112"
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              value={form.email}
              placeholder="contact@supplier.example"
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </Field>
          <Field label="Due date" required hint="Next re-qualification checkpoint">
            <Input
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            />
          </Field>
          <Field label="Performance rating (0-5)">
            <Input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={form.rating}
              onChange={(event) => setForm({ ...form, rating: event.target.value })}
            />
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
        description={viewing ? `${viewing.department} · ${viewing.serviceSupplied ? "Service provider" : "Goods supplier"}` : undefined}
        footer={
          <Button variant="secondary" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      >
        {viewing ? (
          <dl className="divide-y divide-slate-100">
            <DetailRow label="Contact person">{viewing.contactPerson || "—"}</DetailRow>
            <DetailRow label="Phone">
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                {viewing.phone}
              </span>
            </DetailRow>
            <DetailRow label="Email">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                {viewing.email || "—"}
              </span>
            </DetailRow>
            <DetailRow label="Service supplied">{viewing.serviceSupplied ? "Yes" : "No"}</DetailRow>
            <DetailRow label="Due date">
              {formatDate(viewing.dueDate)} ({dueLabel(viewing.dueDate)})
            </DetailRow>
            <DetailRow label="Rating">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {viewing.rating.toFixed(1)} / 5
              </span>
            </DetailRow>
            <DetailRow label="Status">
              <StatusBadge status={viewing.status} />
            </DetailRow>
          </dl>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(toggling)}
        onClose={() => setToggling(null)}
        title={toggling?.status === "Active" ? "Deactivate supplier" : "Reactivate supplier"}
        tone={toggling?.status === "Active" ? "danger" : "primary"}
        confirmLabel={toggling?.status === "Active" ? "Deactivate" : "Reactivate"}
        message={
          <>
            <strong>{toggling?.name}</strong>{" "}
            {toggling?.status === "Active"
              ? "will be removed from the approved vendor list but kept for audit history."
              : "will return to the approved vendor list."}
          </>
        }
        onConfirm={() => {
          if (!toggling) return;
          const next: RecordStatus = toggling.status === "Active" ? "Inactive" : "Active";
          update("suppliers", toggling.id, { status: next });
          toast.push(`${toggling.name} is now ${next.toLowerCase()}.`, "info");
        }}
      />
    </>
  );
}

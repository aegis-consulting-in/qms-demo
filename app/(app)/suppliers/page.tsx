import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClockIcon, ClipboardXIcon, PlusIcon, TruckIcon, BadgeCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ClearFilters, FilterSelect, ListToolbar, SearchInput, SortSelect } from "@/components/shared/list-toolbar";
import { PageHeader, Section } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { StatCard, StatGrid } from "@/components/shared/stat-card";
import { BooleanBadge, StatusBadge } from "@/components/shared/status-badge";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSupplierCategories, getSupplierStats, listSuppliers } from "@/lib/data/suppliers";
import { formatDate, humanize, isOverdue } from "@/lib/format";
import { paginationSchema } from "@/lib/validation/common";
import { SUPPLIER_STATUSES } from "@/lib/validation/suppliers";

export const metadata: Metadata = { title: "Suppliers" };

export default async function SuppliersPage({ searchParams }: PageProps<"/suppliers">) {
  const user = await requirePagePermission(PERMISSIONS.supplier.view);
  const params = await searchParams;
  const filters = paginationSchema.parse(params);
  const status = typeof params.status === "string" ? params.status : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;

  const [{ rows, total }, stats, categories] = await Promise.all([
    listSuppliers({ ...filters, status, category }),
    getSupplierStats(),
    getSupplierCategories(),
  ]);

  type Supplier = (typeof rows)[number];
  const columns: Column<Supplier>[] = [
    {
      key: "name",
      header: "Supplier",
      cell: (s) => (
        <div className="min-w-0">
          <Link href={`/suppliers/${s.id}`} className="font-medium hover:underline">
            {s.name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {s.code}
            {s.category ? ` · ${s.category}` : ""}
          </p>
        </div>
      ),
    },
    { key: "contact", header: "Contact", cell: (s) => s.contact_person ?? s.email ?? "—", hideBelow: "md" },
    { key: "service", header: "Service supplied", cell: (s) => <span className="line-clamp-1">{s.service_supplied ?? "—"}</span>, hideBelow: "lg" },
    { key: "eval", header: "Evaluated", cell: (s) => <BooleanBadge value={s.evaluation_complete} />, hideBelow: "sm" },
    {
      key: "review",
      header: "Review due",
      cell: (s) => <span className={isOverdue(s.review_due_date) ? "font-medium text-destructive" : undefined}>{formatDate(s.review_due_date)}</span>,
      hideBelow: "md",
    },
    { key: "rating", header: "Rating", cell: (s) => (s.rating != null ? `${s.rating} / 5` : "—"), hideBelow: "xl" },
    { key: "status", header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Supplier Management"
        description="Approved supplier register, evaluations and review dates."
        crumbs={[{ label: "Suppliers" }]}
        actions={
          user.can(PERMISSIONS.supplier.create) ? (
            <Button render={<Link href="/suppliers/new" />}>
              <PlusIcon /> New supplier
            </Button>
          ) : null
        }
      />
      <StatGrid>
        <StatCard label="Suppliers" value={stats.total} icon={TruckIcon} />
        <StatCard label="Active" value={stats.active} icon={BadgeCheckIcon} tone="success" />
        <StatCard label="Review due" value={stats.reviewDue} icon={CalendarClockIcon} tone={stats.reviewDue ? "warning" : "default"} />
        <StatCard label="Evaluation pending" value={stats.pendingEvaluation} icon={ClipboardXIcon} tone={stats.pendingEvaluation ? "warning" : "default"} />
      </StatGrid>
      <Section>
        <div className="flex flex-col gap-3">
          <ListToolbar>
            <SearchInput placeholder="Search suppliers…" className="w-full sm:w-72" />
            <FilterSelect param="status" placeholder="All statuses" options={SUPPLIER_STATUSES.map((s) => ({ value: s, label: humanize(s) }))} ariaLabel="Status" />
            {categories.length ? <FilterSelect param="category" placeholder="All categories" options={categories.map((c) => ({ value: c, label: c }))} ariaLabel="Category" /> : null}
            <SortSelect
              options={[
                { value: "name", label: "Name" },
                { value: "code", label: "Code" },
                { value: "review", label: "Review due" },
                { value: "rating", label: "Rating" },
                { value: "status", label: "Status" },
              ]}
            />
            <ClearFilters keys={["q", "status", "category", "sort", "dir"]} />
          </ListToolbar>
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyTitle="No suppliers found" />
          <Pagination page={filters.page} pageSize={filters.pageSize} total={total} />
        </div>
      </Section>
    </div>
  );
}

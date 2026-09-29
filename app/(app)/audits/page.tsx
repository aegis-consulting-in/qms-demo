import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangleIcon, ClipboardCheckIcon, PlusIcon, PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ClearFilters, FilterSelect, ListToolbar, SearchInput, SortSelect } from "@/components/shared/list-toolbar";
import { PageHeader, Section } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { StatCard, StatGrid } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getAuditStats, listAudits } from "@/lib/data/audits";
import { getDepartments } from "@/lib/data/master";
import { formatDate, fullName, humanize } from "@/lib/format";
import { paginationSchema } from "@/lib/validation/common";
import { AUDIT_STATUSES, AUDIT_TYPES } from "@/lib/validation/audits";

export const metadata: Metadata = { title: "Audits" };

export default async function AuditsPage({ searchParams }: PageProps<"/audits">) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = paginationSchema.parse(params);
  const status = typeof params.status === "string" ? params.status : undefined;
  const departmentId = typeof params.department === "string" ? params.department : undefined;
  const auditType = typeof params.type === "string" ? params.type : undefined;

  const [{ rows, total }, stats, departments] = await Promise.all([
    listAudits({ ...filters, status, departmentId, auditType }),
    getAuditStats(),
    getDepartments(),
  ]);

  type Audit = (typeof rows)[number];
  const columns: Column<Audit>[] = [
    {
      key: "title",
      header: "Audit",
      cell: (a) => (
        <div className="min-w-0">
          <Link href={`/audits/${a.id}`} className="font-medium hover:underline">
            {a.title}
          </Link>
          <p className="text-xs text-muted-foreground">{a.code}</p>
        </div>
      ),
    },
    { key: "type", header: "Type", cell: (a) => <StatusBadge status={a.audit_type} />, hideBelow: "md" },
    { key: "department", header: "Department", cell: (a) => a.department?.name ?? "—", hideBelow: "md" },
    { key: "auditor", header: "Auditor", cell: (a) => fullName(a.auditor), hideBelow: "lg" },
    { key: "date", header: "Date", cell: (a) => formatDate(a.audit_date), hideBelow: "sm" },
    { key: "status", header: "Status", cell: (a) => <StatusBadge status={a.status} /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Audit Process"
        description={user.can(PERMISSIONS.audit.view) ? "Audit plans, findings and corrective actions." : "Audits assigned to you as auditor."}
        crumbs={[{ label: "Audits" }]}
        actions={
          user.can(PERMISSIONS.audit.create) ? (
            <Button render={<Link href="/audits/new" />}>
              <PlusIcon /> New audit
            </Button>
          ) : null
        }
      />
      <StatGrid>
        <StatCard label="Audits" value={stats.total} icon={ClipboardCheckIcon} />
        <StatCard label="In progress" value={stats.inProgress} icon={PlayIcon} />
        <StatCard label="Open findings" value={stats.openFindings} icon={AlertTriangleIcon} tone={stats.openFindings ? "warning" : "default"} />
        <StatCard label="Open CAPA" value={stats.openActions} icon={AlertTriangleIcon} tone={stats.openActions ? "warning" : "default"} />
      </StatGrid>
      <Section>
        <div className="flex flex-col gap-3">
          <ListToolbar>
            <SearchInput placeholder="Search audits…" className="w-full sm:w-72" />
            <FilterSelect param="status" placeholder="All statuses" options={AUDIT_STATUSES.map((s) => ({ value: s, label: humanize(s) }))} ariaLabel="Status" />
            <FilterSelect param="type" placeholder="All types" options={AUDIT_TYPES.map((t) => ({ value: t, label: humanize(t) }))} ariaLabel="Audit type" />
            <FilterSelect param="department" placeholder="All departments" options={departments.map((d) => ({ value: d.id, label: d.name }))} ariaLabel="Department" />
            <SortSelect
              options={[
                { value: "date", label: "Audit date" },
                { value: "title", label: "Title" },
                { value: "code", label: "Code" },
                { value: "status", label: "Status" },
              ]}
            />
            <ClearFilters keys={["q", "status", "type", "department", "sort", "dir"]} />
          </ListToolbar>
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyTitle="No audits found" />
          <Pagination page={filters.page} pageSize={filters.pageSize} total={total} />
        </div>
      </Section>
    </div>
  );
}

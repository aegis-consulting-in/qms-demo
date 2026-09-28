import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ClearFilters, ListToolbar, SearchInput } from "@/components/shared/list-toolbar";
import { PageHeader, Section } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listAuditLogs } from "@/lib/data/admin";
import { formatDateTime } from "@/lib/format";
import { auditLogFilterSchema } from "@/lib/validation/admin";

export const metadata: Metadata = { title: "Audit logs" };

export default async function AdminAuditLogsPage({ searchParams }: PageProps<"/admin/audit-logs">) {
  const user = await requirePagePermission(PERMISSIONS.admin.auditLogs);
  const params = await searchParams;
  const filters = auditLogFilterSchema.parse(params);
  const { rows, total, pageSize } = await listAuditLogs({
    page: filters.page,
    action: filters.action || undefined,
    entityType: filters.entityType || undefined,
    actor: filters.actor || undefined,
  });

  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "when", header: "When", cell: (r) => formatDateTime(r.created_at) },
    {
      key: "actor",
      header: "Actor",
      cell: (r) => <span className="text-xs">{r.actor_email ?? r.actor_id ?? "system"}</span>,
    },
    { key: "action", header: "Action", cell: (r) => <span className="font-mono text-xs">{r.action}</span> },
    {
      key: "entity",
      header: "Entity",
      cell: (r) => (r.entity_type ? `${r.entity_type}${r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ""}` : "—"),
      hideBelow: "md",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Audit Logs"
        description="Important mutations are recorded with the signed-in actor. The actor cannot be spoofed from the client."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Audit logs" }]}
      />
      <AdminNav can={(k) => user.can(k)} current="audit-logs" />
      <Section>
        <div className="flex flex-col gap-3">
          <ListToolbar>
            <SearchInput placeholder="Filter by action…" param="action" className="w-full sm:w-56" />
            <SearchInput placeholder="Entity type…" param="entityType" className="w-full sm:w-40" />
            <SearchInput placeholder="Actor email…" param="actor" className="w-full sm:w-56" />
            <ClearFilters keys={["action", "entityType", "actor"]} />
          </ListToolbar>
          <DataTable columns={columns} rows={rows} rowKey={(r) => String(r.id)} emptyTitle="No log entries" />
          <Pagination page={filters.page} pageSize={pageSize} total={total} />
        </div>
      </Section>
    </div>
  );
}

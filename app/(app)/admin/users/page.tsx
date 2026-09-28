import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, UsersIcon, UserCheckIcon } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ClearFilters, FilterSelect, ListToolbar, SearchInput } from "@/components/shared/list-toolbar";
import { PageHeader, Section } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { StatCard, StatGrid } from "@/components/shared/stat-card";
import { BooleanBadge } from "@/components/shared/status-badge";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getAdminStats, listUsers } from "@/lib/data/admin";
import { one } from "@/lib/data/helpers";
import { paginationSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const user = await requirePagePermission(PERMISSIONS.admin.users);
  const params = await searchParams;
  const filters = paginationSchema.parse(params);
  const status = (typeof params.status === "string" ? params.status : "all") as "active" | "inactive" | "all";
  const [{ rows, total }, stats] = await Promise.all([listUsers({ ...filters, status }), getAdminStats()]);

  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "User",
      cell: (r) => (
        <div className="min-w-0">
          <Link href={`/admin/users/${r.id}`} className="font-medium hover:underline">
            {r.full_name ?? r.email}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{r.email}</p>
        </div>
      ),
    },
    {
      key: "employee",
      header: "Employee",
      cell: (r) => {
        const emp = one(r.employee);
        return emp ? `${emp.employee_code} · ${emp.first_name} ${emp.last_name}` : "—";
      },
      hideBelow: "md",
    },
    {
      key: "roles",
      header: "Roles",
      cell: (r) => r.roles.map((x) => x.name).join(", ") || "—",
      hideBelow: "sm",
    },
    { key: "active", header: "Active", cell: (r) => <BooleanBadge value={r.is_active} /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="User Management"
        description="Accounts, roles and access."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Users" }]}
        actions={
          <Button render={<Link href="/admin/users/new" />}>
            <PlusIcon /> New user
          </Button>
        }
      />
      <AdminNav can={(k) => user.can(k)} current="users" />
      <StatGrid className="lg:grid-cols-2">
        <StatCard label="Users" value={stats.users} icon={UsersIcon} />
        <StatCard label="Active" value={stats.activeUsers} icon={UserCheckIcon} tone="success" />
      </StatGrid>
      <Section>
        <div className="flex flex-col gap-3">
          <ListToolbar>
            <SearchInput placeholder="Search users…" className="w-full sm:w-72" />
            <FilterSelect
              param="status"
              placeholder="All"
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              ariaLabel="Status"
            />
            <ClearFilters keys={["q", "status"]} />
          </ListToolbar>
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyTitle="No users found" />
          <Pagination page={filters.page} pageSize={filters.pageSize} total={total} />
        </div>
      </Section>
    </div>
  );
}

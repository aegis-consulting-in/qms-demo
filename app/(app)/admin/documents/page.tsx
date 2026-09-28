import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { FileList } from "@/components/documents/file-list";
import { ClearFilters, FilterSelect, ListToolbar, SearchInput } from "@/components/shared/list-toolbar";
import { PageHeader, Section } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getDocumentStats, listAllDocuments } from "@/lib/data/documents";
import { MODULE_LABELS, formatBytes } from "@/lib/documents/storage";
import { paginationSchema } from "@/lib/validation/common";
import type { DocumentModule } from "@/lib/types/database";

export const metadata: Metadata = { title: "Document management" };

const MODULES = Object.keys(MODULE_LABELS) as DocumentModule[];

export default async function AdminDocumentsPage({ searchParams }: PageProps<"/admin/documents">) {
  const user = await requirePagePermission(PERMISSIONS.admin.documents);
  const params = await searchParams;
  const filters = paginationSchema.parse(params);
  const moduleFilter = typeof params.module === "string" ? params.module : undefined;
  const [{ rows, total }, stats] = await Promise.all([listAllDocuments({ ...filters, module: moduleFilter }), getDocumentStats()]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Document Management"
        description="Search across files you are authorised to see. Row-level security still applies — this is not a bypass."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Documents" }]}
      />
      <AdminNav can={(k) => user.can(k)} current="documents" />
      <p className="text-sm text-muted-foreground">
        {stats.total} file{stats.total === 1 ? "" : "s"} · {formatBytes(stats.bytes)} · Browse by module in the{" "}
        <Link href="/documents" className="text-brand hover:underline">
          document library
        </Link>
        .
      </p>
      <Section>
        <div className="flex flex-col gap-3">
          <ListToolbar>
            <SearchInput placeholder="Search file names…" className="w-full sm:w-72" />
            <FilterSelect
              param="module"
              placeholder="All modules"
              options={MODULES.map((m) => ({ value: m, label: MODULE_LABELS[m] }))}
              ariaLabel="Module"
            />
            <ClearFilters keys={["q", "module"]} />
          </ListToolbar>
          <FileList
            files={rows}
            canDownload={user.can(PERMISSIONS.documents.download)}
            canDelete={user.can(PERMISSIONS.documents.delete)}
            emptyTitle="No matching files"
          />
          <Pagination page={filters.page} pageSize={filters.pageSize} total={total} />
        </div>
      </Section>
    </div>
  );
}

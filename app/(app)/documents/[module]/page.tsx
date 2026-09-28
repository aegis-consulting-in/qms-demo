import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FolderIcon } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getModuleFolders, resolveEntityNames } from "@/lib/data/documents";
import { folderForModule, parseDocumentModule } from "@/lib/documents/modules";
import { entityHref, formatBytes } from "@/lib/documents/storage";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentModulePage({ params }: PageProps<"/documents/[module]">) {
  await requirePagePermission(PERMISSIONS.documents.view);
  const { module: slug } = await params;
  const docModule = parseDocumentModule(slug);
  if (!docModule) notFound();
  const folder = folderForModule(docModule);

  const folders = await getModuleFolders(docModule);
  const names = await resolveEntityNames(docModule, folders.map((f) => f.entityId));

  type Row = (typeof folders)[number];
  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Record",
      cell: (f) => (
        <Link href={`/documents/${docModule}/${f.entityId}`} className="inline-flex items-center gap-2 font-medium hover:underline">
          <FolderIcon className="size-4 text-amber-500" />
          {names[f.entityId] ?? f.entityId}
        </Link>
      ),
    },
    { key: "count", header: "Files", cell: (f) => f.count, hideBelow: "sm" },
    { key: "size", header: "Size", cell: (f) => formatBytes(f.bytes), hideBelow: "md" },
    { key: "latest", header: "Latest upload", cell: (f) => formatDateTime(f.latest), hideBelow: "lg" },
    {
      key: "open",
      header: "",
      className: "text-right",
      cell: (f) => (
        <Link href={entityHref(docModule, f.entityId)} className="text-xs text-brand hover:underline">
          Open record
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={folder?.label ?? "Documents"}
        description="Only records that contain files you are allowed to see."
        crumbs={[{ label: "Documents", href: "/documents" }, { label: folder?.label ?? docModule }]}
      />
      <Section>
        <DataTable
          columns={columns}
          rows={folders}
          rowKey={(r) => r.entityId}
          emptyTitle="No documents in this folder"
          emptyDescription="Upload files from the related record. They will appear here if you have access."
        />
      </Section>
    </div>
  );
}

import type { Metadata } from "next";
import { FolderCard } from "@/components/layout/folder-card";
import { PageHeader } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getModuleFolders } from "@/lib/data/documents";
import { FOLDERS } from "@/lib/navigation";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsLibraryPage() {
  const user = await requirePagePermission(PERMISSIONS.documents.view);
  const counts = Object.fromEntries(
    await Promise.all(FOLDERS.map(async (f) => [f.key, (await getModuleFolders(f.key)).reduce((n, x) => n + x.count, 0)] as const)),
  ) as Record<string, number>;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Document library"
        description="Files are grouped by module. You only see documents for records you are authorised to access."
        crumbs={[{ label: "Documents" }]}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
        {FOLDERS.map((f) => (
          <FolderCard key={f.key} label={f.label} href={f.href} count={counts[f.key] ?? 0} variant="tile" />
        ))}
      </div>
      {!user.can(PERMISSIONS.documents.upload) ? (
        <p className="text-sm text-muted-foreground">Upload happens from the related record (training, project, supplier, and so on).</p>
      ) : null}
    </div>
  );
}

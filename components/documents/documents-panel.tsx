import { PaperclipIcon } from "lucide-react";
import { Section } from "@/components/shared/page-header";
import { getCurrentUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getEntityDocuments } from "@/lib/data/documents";
import type { DocumentModule } from "@/lib/types/database";
import { FileList } from "./file-list";
import { FileUpload } from "./file-upload";

/**
 * Server component: lists an entity's documents and, when permitted, shows the
 * uploader. Drop it onto any detail page.
 */
export async function DocumentsPanel({
  module,
  entityId,
  title = "Documents",
  className,
}: {
  module: DocumentModule;
  entityId: string;
  title?: string;
  className?: string;
}) {
  const user = await getCurrentUser();
  if (!user || !user.can(PERMISSIONS.documents.view)) return null;

  const files = await getEntityDocuments(module, entityId);
  const canUpload = user.can(PERMISSIONS.documents.upload);

  return (
    <Section
      title={
        <span className="inline-flex items-center gap-1.5">
          <PaperclipIcon className="size-4 text-muted-foreground" /> {title}
          <span className="rounded-full bg-muted px-1.5 text-xs font-normal text-muted-foreground tabular-nums">{files.length}</span>
        </span>
      }
      className={className}
    >
      <div className="flex flex-col gap-4">
        {canUpload ? <FileUpload module={module} entityId={entityId} compact /> : null}
        <FileList files={files} canDownload={user.can(PERMISSIONS.documents.download)} canDelete={user.can(PERMISSIONS.documents.delete)} />
      </div>
    </Section>
  );
}

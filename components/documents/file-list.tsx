"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DownloadIcon,
  ExternalLinkIcon,
  FileIcon,
  FileImageIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FileTypeIcon,
  PresentationIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { deleteDocumentAction } from "@/lib/actions/documents";
import { fileKind, formatBytes } from "@/lib/documents/storage";
import { formatDateTime } from "@/lib/format";

export type FileListItem = {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  description?: string | null;
  uploader?: { full_name: string | null; email: string } | null;
};

const ICONS = {
  pdf: FileTextIcon,
  image: FileImageIcon,
  sheet: FileSpreadsheetIcon,
  doc: FileTypeIcon,
  slides: PresentationIcon,
  text: FileTextIcon,
  other: FileIcon,
};

export function FileList({
  files,
  canDownload,
  canDelete,
  emptyTitle = "No documents yet",
}: {
  files: FileListItem[];
  canDownload: boolean;
  canDelete: boolean;
  emptyTitle?: string;
}) {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<FileListItem | null>(null);

  if (!files.length) {
    return <EmptyState icon={FileIcon} title={emptyTitle} description="Uploaded files for this record will appear here." className="py-8" />;
  }

  const onDelete = async () => {
    if (!pendingDelete) return;
    const res = await deleteDocumentAction({ id: pendingDelete.id });
    if (res.ok) {
      toast.success("Document deleted.");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <>
      <ul className="divide-y rounded-lg border">
        {files.map((f) => {
          const Icon = ICONS[fileKind(f.mime_type)];
          const canPreview = fileKind(f.mime_type) === "pdf" || fileKind(f.mime_type) === "image";
          return (
            <li key={f.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{f.file_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatBytes(f.file_size)} · {formatDateTime(f.created_at)}
                  {f.uploader ? ` · ${f.uploader.full_name ?? f.uploader.email}` : ""}
                  {f.description ? ` · ${f.description}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {canDownload && canPreview ? (
                  <Button variant="ghost" size="icon-sm" render={<a href={`/api/documents/${f.id}/download?inline=1`} target="_blank" rel="noopener" />} aria-label="Open">
                    <ExternalLinkIcon />
                  </Button>
                ) : null}
                {canDownload ? (
                  <Button variant="ghost" size="icon-sm" render={<a href={`/api/documents/${f.id}/download`} />} aria-label="Download">
                    <DownloadIcon />
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setPendingDelete(f)} aria-label="Delete">
                    <Trash2Icon />
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete this document?"
        description={pendingDelete ? `"${pendingDelete.file_name}" will be permanently removed from storage.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
      />
    </>
  );
}

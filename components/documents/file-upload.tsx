"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, FileIcon, Loader2Icon, UploadCloudIcon, XCircleIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { finalizeUploadAction, requestUploadAction } from "@/lib/actions/documents";
import { createClient } from "@/lib/supabase/client";
import { DOCUMENTS_BUCKET, formatBytes } from "@/lib/documents/storage";
import type { DocumentModule } from "@/lib/types/database";
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/validation/documents";

type QueuedFile = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
};

const ACCEPT = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",");

function validateFile(file: File): string | null {
  if (file.size === 0) return "File is empty.";
  if (file.size > MAX_FILE_SIZE_BYTES) return `Exceeds the ${formatBytes(MAX_FILE_SIZE_BYTES)} limit.`;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) return `.${ext || "?"} files are not allowed.`;
  if (file.type && !(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) return "This file type is not allowed.";
  return null;
}

/** Browser may report an empty MIME for some extensions; fall back by extension. */
function resolveMime(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
  };
  return (ext && map[ext]) || "application/octet-stream";
}

/**
 * Reusable drag-and-drop uploader.
 *
 * Flow per file: server action issues a signed upload URL (after checking
 * permission + entity access) → browser uploads directly to Storage with
 * progress → server action records metadata. The service-role key is never
 * involved; storage RLS applies to the upload itself.
 */
export function FileUpload({
  module,
  entityId,
  onUploaded,
  className,
  compact = false,
}: {
  module: DocumentModule;
  entityId: string;
  onUploaded?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragging, setDragging] = useState(false);

  const update = (id: string, patch: Partial<QueuedFile>) =>
    setQueue((q) => q.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const uploadOne = useCallback(
    async (item: QueuedFile) => {
      update(item.id, { status: "uploading", progress: 5 });
      const mimeType = resolveMime(item.file);

      const req = await requestUploadAction({
        module,
        entityId,
        fileName: item.file.name,
        mimeType,
        fileSize: item.file.size,
      });
      if (!req.ok) {
        update(item.id, { status: "error", error: req.fieldErrors ? Object.values(req.fieldErrors).flat()[0] ?? req.error : req.error });
        return false;
      }

      // Upload with progress via XHR against the signed URL (supabase-js uploadToSignedUrl has no progress callback).
      const ok = await new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", req.data.signedUrl, true);
        xhr.setRequestHeader("Content-Type", mimeType);
        xhr.setRequestHeader("x-upsert", "false");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) update(item.id, { progress: Math.max(5, Math.round((e.loaded / e.total) * 90)) });
        };
        xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
        xhr.onerror = () => resolve(false);
        xhr.send(item.file);
      });

      if (!ok) {
        update(item.id, { status: "error", error: "Upload to storage failed. Please retry." });
        return false;
      }

      const fin = await finalizeUploadAction({
        module,
        entityId,
        storagePath: req.data.storagePath,
        fileName: item.file.name,
        mimeType,
        fileSize: item.file.size,
      });
      if (!fin.ok) {
        // Best-effort cleanup of the orphaned object.
        void createClient().storage.from(DOCUMENTS_BUCKET).remove([req.data.storagePath]);
        update(item.id, { status: "error", error: fin.error });
        return false;
      }
      update(item.id, { status: "done", progress: 100 });
      return true;
    },
    [module, entityId],
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const items: QueuedFile[] = Array.from(files).map((file) => {
        const error = validateFile(file);
        return { id: crypto.randomUUID(), file, status: error ? "error" : "queued", progress: 0, error: error ?? undefined };
      });
      setQueue((q) => [...q, ...items]);

      let success = 0;
      for (const item of items) {
        if (item.status === "error") continue;
        if (await uploadOne(item)) success += 1;
      }
      if (success) {
        toast.success(success === 1 ? "File uploaded." : `${success} files uploaded.`);
        onUploaded?.();
        router.refresh();
      }
    },
    [uploadOne, onUploaded, router],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
  };

  const remove = (id: string) => setQueue((q) => q.filter((i) => i.id !== id));
  const clearFinished = () => setQueue((q) => q.filter((i) => i.status !== "done"));

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center transition-colors",
          compact ? "px-4 py-4" : "px-6 py-8",
          dragging ? "border-brand bg-brand/5" : "border-border hover:border-brand/50 hover:bg-muted/40",
        )}
      >
        <UploadCloudIcon className={cn("text-brand", compact ? "size-5" : "size-7")} />
        <p className="text-sm font-medium">
          Drop files here or <span className="text-brand underline">browse</span>
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, Office, images, text · up to {formatBytes(MAX_FILE_SIZE_BYTES)} each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {queue.length ? (
        <ul className="flex flex-col gap-2">
          {queue.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{item.file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(item.file.size)}</span>
                </div>
                {item.status === "uploading" ? <Progress value={item.progress} className="mt-1 h-1.5" /> : null}
                {item.status === "error" ? <p className="text-xs text-destructive">{item.error}</p> : null}
              </div>
              {item.status === "uploading" ? <Loader2Icon className="size-4 animate-spin text-brand" /> : null}
              {item.status === "done" ? <CheckCircle2Icon className="size-4 text-success" /> : null}
              {item.status === "error" ? <XCircleIcon className="size-4 text-destructive" /> : null}
              {item.status !== "uploading" ? (
                <button type="button" onClick={() => remove(item.id)} className="text-muted-foreground hover:text-foreground" aria-label="Remove from list">
                  <XIcon className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
          {queue.some((i) => i.status === "done") ? (
            <li className="text-right">
              <Button type="button" variant="ghost" size="sm" onClick={clearFinished}>
                Clear completed
              </Button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

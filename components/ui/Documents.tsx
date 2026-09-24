"use client";

import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { attachFiles, getFileUrl, isPreviewable, releaseFile } from "@/lib/file-store";
import type { DocumentRef } from "@/lib/types";
import { cx, formatBytes, formatDateTime } from "@/lib/utils";
import { Badge } from "./Badge";
import { Button, IconButton } from "./Button";
import { EmptyState } from "./DataTable";
import { Modal } from "./Modal";

export function documentIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-violet-600" />;
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv"))
    return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />;
  return <FileText className="h-4 w-4 text-sky-600" />;
}

export function FileUploadZone({
  onFiles,
  label = "Attach documents",
  hint = "PDF, image or spreadsheet. Files stay in this browser session.",
  uploadedBy,
  category,
  compact = false,
}: {
  onFiles: (documents: DocumentRef[]) => void;
  label?: string;
  hint?: string;
  uploadedBy: string;
  category?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFiles(attachFiles(files, uploadedBy, category));
    if (inputRef.current) inputRef.current.value = "";
  };

  if (compact) {
    return (
      <>
        <Button
          variant="secondary"
          size="sm"
          icon={<Paperclip className="h-3.5 w-3.5" />}
          onClick={() => inputRef.current?.click()}
        >
          {label}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => handle(event.target.files)}
        />
      </>
    );
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        handle(event.dataTransfer.files);
      }}
      className={cx(
        "flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
        dragging ? "border-indigo-400 bg-indigo-50/60" : "border-slate-300 bg-slate-50/60",
      )}
    >
      <UploadCloud className={cx("h-6 w-6", dragging ? "text-indigo-500" : "text-slate-400")} />
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <p className="max-w-xs text-xs text-slate-500">{hint}</p>
      <Button variant="secondary" size="sm" className="mt-1" onClick={() => inputRef.current?.click()}>
        Browse files
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => handle(event.target.files)}
      />
    </div>
  );
}

export function DocumentList({
  documents,
  onRemove,
  emptyMessage = "No documents attached yet.",
  dense = false,
}: {
  documents: DocumentRef[];
  onRemove?: (document: DocumentRef) => void;
  emptyMessage?: string;
  dense?: boolean;
}) {
  const [preview, setPreview] = useState<DocumentRef | null>(null);

  if (documents.length === 0) {
    return (
      <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500 ring-1 ring-inset ring-slate-200">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      <ul className={cx("space-y-2", dense ? "text-xs" : "text-sm")}>
        {documents.map((document) => (
          <li
            key={document.id}
            className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-inset ring-slate-200"
          >
            <span className="shrink-0">{documentIcon(document.mimeType)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-800">{document.name}</p>
              <p className="truncate text-xs text-slate-500">
                {formatBytes(document.size)} · {document.uploadedBy} · {formatDateTime(document.uploadedAt)}
              </p>
            </div>
            {document.category ? (
              <Badge tone="slate" className="hidden sm:inline-flex">
                {document.category}
              </Badge>
            ) : null}
            <IconButton
              label={`Preview ${document.name}`}
              icon={<Eye className="h-4 w-4" />}
              onClick={() => setPreview(document)}
            />
            {onRemove ? (
              <IconButton
                label={`Remove ${document.name}`}
                icon={<Trash2 className="h-4 w-4" />}
                className="hover:bg-rose-50 hover:text-rose-600"
                onClick={() => {
                  releaseFile(document.id);
                  onRemove(document);
                }}
              />
            ) : null}
          </li>
        ))}
      </ul>
      <DocumentPreview document={preview} onClose={() => setPreview(null)} />
    </>
  );
}

export function DocumentPreview({
  document,
  onClose,
}: {
  document: DocumentRef | null;
  onClose: () => void;
}) {
  const url = document ? getFileUrl(document.id) : undefined;

  return (
    <Modal
      open={Boolean(document)}
      onClose={onClose}
      title={document?.name ?? "Document"}
      description={
        document
          ? `${formatBytes(document.size)} · uploaded by ${document.uploadedBy} on ${formatDateTime(document.uploadedAt)}`
          : undefined
      }
      size="lg"
      footer={
        <>
          {url ? (
            <a
              href={url}
              download={document?.name}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {!document ? null : url && isPreviewable(document.mimeType) ? (
        document.mimeType.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob URLs cannot be optimised by next/image
          <img
            src={url}
            alt={document.name}
            className="mx-auto max-h-[60vh] rounded-lg object-contain ring-1 ring-slate-200"
          />
        ) : (
          <iframe
            src={url}
            title={document.name}
            className="h-[60vh] w-full rounded-lg ring-1 ring-slate-200"
          />
        )
      ) : (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title={document.seeded ? "Seeded demo document" : "Preview not available"}
          message={
            document.seeded
              ? "This record ships with the mock data set, so there is no file blob behind it. Upload your own file to see the live preview."
              : "The object URL for this upload was released when the page reloaded. Metadata is still stored locally — re-upload the file to preview it again."
          }
        />
      )}
    </Modal>
  );
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{children}</h3>
      {action}
    </div>
  );
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-1.5 sm:grid-cols-3 sm:gap-3">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="col-span-2 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

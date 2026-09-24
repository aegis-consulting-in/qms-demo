import type { DocumentRef } from "./types";
import { createId, nowIso } from "./utils";

/**
 * Object URLs only live as long as the document that created them, so uploads are
 * kept in this in-memory registry while their metadata is persisted to localStorage.
 * After a reload the record survives but the blob is gone, which the viewer surfaces.
 */
const objectUrls = new Map<string, string>();

export function attachFile(file: File, uploadedBy: string, category?: string): DocumentRef {
  const id = createId("doc");
  objectUrls.set(id, URL.createObjectURL(file));
  return {
    id,
    name: file.name,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    uploadedAt: nowIso(),
    uploadedBy,
    category,
  };
}

export function attachFiles(files: FileList | File[], uploadedBy: string, category?: string) {
  return Array.from(files).map((file) => attachFile(file, uploadedBy, category));
}

export function getFileUrl(documentId: string) {
  return objectUrls.get(documentId);
}

export function releaseFile(documentId: string) {
  const url = objectUrls.get(documentId);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrls.delete(documentId);
  }
}

export function isPreviewable(mimeType: string) {
  return (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf" ||
    mimeType.startsWith("text/")
  );
}

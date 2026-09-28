"use client";

import { useRef } from "react";
import { FileIcon, PaperclipIcon, XIcon } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { formatBytes } from "@/lib/documents/storage";
import { validateFile } from "@/lib/documents/upload-client";
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from "@/lib/validation/documents";

const ACCEPT = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",");

/**
 * Form-side file picker used while creating a record (no entity id yet).
 * Chosen files are uploaded after the record is saved.
 */
export function AttachFilesField({
  files,
  onChange,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (list: FileList | null) => {
    if (!list?.length) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      const error = validateFile(file);
      if (error) continue;
      if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
      next.push(file);
    }
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <FormField
      label="Attachments"
      hint={`PDF, Office, images, text · up to ${formatBytes(MAX_FILE_SIZE_BYTES)} each. Files are stored after you save.`}
    >
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="inline-flex w-fit items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <PaperclipIcon className="size-4" />
          Attach file
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => add(e.target.files)}
        />
        {files.length ? (
          <ul className="flex flex-col gap-1.5">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}`} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm">
                <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => onChange(files.filter((f) => f !== file))}
                >
                  <XIcon className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </FormField>
  );
}

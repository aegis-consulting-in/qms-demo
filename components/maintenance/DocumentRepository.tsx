"use client";

import { Eye, FolderOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { useQms } from "@/lib/store";
import type { DocumentRef } from "@/lib/types";
import { formatBytes, formatDateTime, matchesQuery } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { CellStack, DataTable, type Column } from "@/components/ui/DataTable";
import { DocumentPreview, documentIcon } from "@/components/ui/Documents";
import { Select } from "@/components/ui/Form";
import { FilterBar, SearchInput } from "@/components/ui/Tabs";

interface IndexedDocument extends DocumentRef {
  assetName: string;
  assetSerial: string;
  source: "Asset file" | "Maintenance request";
}

export function DocumentRepository() {
  const { state } = useQms();
  const [query, setQuery] = useState("");
  const [assetFilter, setAssetFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState<"All" | IndexedDocument["source"]>("All");
  const [preview, setPreview] = useState<DocumentRef | null>(null);

  const index = useMemo<IndexedDocument[]>(() => {
    const fromAssets = state.assets.flatMap((asset) =>
      asset.documents.map((document) => ({
        ...document,
        assetName: asset.name,
        assetSerial: asset.serialNumber,
        source: "Asset file" as const,
      })),
    );
    const fromRequests = state.maintenanceRequests.flatMap((request) => {
      const asset = state.assets.find((item) => item.id === request.assetId);
      return request.documents.map((document) => ({
        ...document,
        assetName: asset?.name ?? "Unknown asset",
        assetSerial: asset?.serialNumber ?? "—",
        source: "Maintenance request" as const,
      }));
    });

    // Attaching a record to a request also copies it to the asset file, so de-duplicate by id.
    const seen = new Set<string>();
    return [...fromAssets, ...fromRequests].filter((document) => {
      if (seen.has(document.id)) return false;
      seen.add(document.id);
      return true;
    });
  }, [state.assets, state.maintenanceRequests]);

  const rows = useMemo(
    () =>
      index.filter(
        (document) =>
          (assetFilter === "All" || document.assetSerial === assetFilter) &&
          (sourceFilter === "All" || document.source === sourceFilter) &&
          matchesQuery(
            query,
            document.name,
            document.assetName,
            document.assetSerial,
            document.category,
            document.uploadedBy,
          ),
      ),
    [index, assetFilter, sourceFilter, query],
  );

  const totalSize = index.reduce((sum, document) => sum + document.size, 0);
  const sessionFiles = index.filter((document) => !document.seeded).length;

  const columns: Array<Column<IndexedDocument>> = [
    {
      key: "file",
      header: "Document",
      render: (document) => (
        <div className="flex items-center gap-2.5">
          <span className="shrink-0">{documentIcon(document.mimeType)}</span>
          <CellStack primary={document.name} secondary={formatBytes(document.size)} />
        </div>
      ),
    },
    {
      key: "asset",
      header: "Equipment",
      render: (document) => <CellStack primary={document.assetName} secondary={document.assetSerial} />,
    },
    {
      key: "category",
      header: "Category",
      hideBelow: "md",
      render: (document) => <Badge tone="slate">{document.category ?? "Uncategorised"}</Badge>,
    },
    {
      key: "source",
      header: "Source",
      hideBelow: "lg",
      render: (document) => (
        <Badge tone={document.source === "Asset file" ? "indigo" : "sky"}>{document.source}</Badge>
      ),
    },
    {
      key: "uploaded",
      header: "Uploaded",
      hideBelow: "lg",
      render: (document) => (
        <div className="text-xs">
          <p className="text-slate-700">{document.uploadedBy}</p>
          <p className="text-slate-400">{formatDateTime(document.uploadedAt)}</p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (document) => (
        <IconButton
          label={`Preview ${document.name}`}
          icon={<Eye className="h-4 w-4" />}
          onClick={() => setPreview(document)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Indexed documents" value={index.length} icon={<FolderOpen className="h-5 w-5" />} />
        <StatTile
          label="Total size"
          value={formatBytes(totalSize)}
          hint="Metadata persisted locally"
          tone="sky"
        />
        <StatTile
          label="Uploaded this session"
          value={sessionFiles}
          hint="Previewable until the page reloads"
          tone="emerald"
        />
      </div>

      <Card>
        <CardHeader
          title="Document repository / index"
          description="Every equipment file attached through the asset registry or a maintenance request"
          icon={<FolderOpen className="h-4 w-4" />}
        />
        <FilterBar>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search documents, equipment or uploader…"
            className="sm:w-80"
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-52">
              <Select value={assetFilter} onChange={(event) => setAssetFilter(event.target.value)}>
                <option value="All">All equipment</option>
                {state.assets.map((asset) => (
                  <option key={asset.id} value={asset.serialNumber}>
                    {asset.serialNumber} — {asset.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-48">
              <Select
                value={sourceFilter}
                onChange={(event) =>
                  setSourceFilter(event.target.value as "All" | IndexedDocument["source"])
                }
              >
                <option value="All">All sources</option>
                <option value="Asset file">Asset file</option>
                <option value="Maintenance request">Maintenance request</option>
              </Select>
            </div>
          </div>
        </FilterBar>

        <DataTable
          columns={columns}
          rows={rows}
          emptyTitle="No documents indexed"
          emptyMessage="Attach inspection reports or maintenance records to see them listed here."
        />
      </Card>

      <DocumentPreview document={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

"use client";

import { AlertOctagon, CalendarClock, CheckCircle2, FolderOpen, HardDrive, Wrench } from "lucide-react";
import { useState } from "react";
import { AssetRegistry } from "@/components/maintenance/AssetRegistry";
import { DocumentRepository } from "@/components/maintenance/DocumentRepository";
import { MaintenanceRequests } from "@/components/maintenance/MaintenanceRequests";
import { StatTile } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { useQms } from "@/lib/store";
import { daysUntil } from "@/lib/utils";

type PpmTab = "assets" | "requests" | "repository";

export default function MaintenancePage() {
  const { state } = useQms();
  const [tab, setTab] = useState<PpmTab>("assets");

  const activeAssets = state.assets.filter((asset) => asset.status === "Active");
  const overdue = activeAssets.filter((asset) => daysUntil(asset.dueDate) < 0);
  const dueSoon = activeAssets.filter((asset) => {
    const days = daysUntil(asset.dueDate);
    return days >= 0 && days <= 14;
  });
  const openRequests = state.maintenanceRequests.filter(
    (request) => request.status === "Open" || request.status === "In Progress",
  );
  const documentCount =
    state.assets.reduce((sum, asset) => sum + asset.documents.length, 0) +
    state.maintenanceRequests.reduce((sum, request) => sum + request.documents.length, 0);

  const tabs: Array<TabItem<PpmTab>> = [
    { id: "assets", label: "Asset registry", icon: <HardDrive className="h-3.5 w-3.5" />, count: state.assets.length },
    { id: "requests", label: "Maintenance workflow", icon: <Wrench className="h-3.5 w-3.5" />, count: state.maintenanceRequests.length },
    { id: "repository", label: "Document repository", icon: <FolderOpen className="h-3.5 w-3.5" />, count: documentCount },
  ];

  return (
    <>
      <PageHeader
        title="Preventive maintenance (PPM)"
        description="Equipment registry, maintenance workflow and the consolidated document index."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Active assets"
          value={activeAssets.length}
          hint={`${state.assets.length - activeAssets.length} decommissioned`}
          icon={<HardDrive className="h-5 w-5" />}
        />
        <StatTile
          label="Overdue PPM"
          value={overdue.length}
          hint="Past the scheduled due date"
          tone="rose"
          icon={<AlertOctagon className="h-5 w-5" />}
        />
        <StatTile
          label="Due within 14 days"
          value={dueSoon.length}
          hint="Reminder window"
          tone="amber"
          icon={<CalendarClock className="h-5 w-5" />}
        />
        <StatTile
          label="Open work orders"
          value={openRequests.length}
          hint={`${state.maintenanceRequests.length} logged in total`}
          tone="sky"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </div>

      <Tabs items={tabs} value={tab} onChange={setTab} className="mb-4" />

      {tab === "assets" ? <AssetRegistry /> : null}
      {tab === "requests" ? <MaintenanceRequests /> : null}
      {tab === "repository" ? <DocumentRepository /> : null}
    </>
  );
}

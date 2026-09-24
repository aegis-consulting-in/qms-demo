"use client";

import { AlertTriangle, BarChart3, ClipboardCheck, GitBranch } from "lucide-react";
import { AuditWorkspace } from "@/components/audits/AuditWorkspace";
import { StatTile } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useQms } from "@/lib/store";

export default function AuditsPage() {
  const { state } = useQms();

  const activeAudits = state.audits.filter((audit) => audit.status === "Active");
  const findings = state.subProcesses.flatMap((subProcess) =>
    subProcess.clauseChecks.filter(
      (check) => check.verdict === "Minor NC" || check.verdict === "Major NC",
    ),
  );
  const majorFindings = findings.filter((check) => check.verdict === "Major NC").length;
  const evaluated = state.subProcesses.filter((subProcess) => subProcess.evaluation?.approved).length;

  return (
    <>
      <PageHeader
        title="Audit process"
        description="Create process audits, inherit base details into sub-processes, then work the KPI, evidence and effectiveness stages."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Active audits"
          value={activeAudits.length}
          hint={`${state.audits.length} in the registry`}
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
        <StatTile
          label="Sub-processes"
          value={state.subProcesses.length}
          hint={`${evaluated} effectiveness approved`}
          tone="sky"
          icon={<GitBranch className="h-5 w-5" />}
        />
        <StatTile
          label="Open findings"
          value={findings.length}
          hint={`${majorFindings} major non-conformities`}
          tone={majorFindings > 0 ? "rose" : "amber"}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatTile
          label="KPIs tracked"
          value={state.subProcesses.reduce((sum, subProcess) => sum + subProcess.kpis.length, 0)}
          hint="Across all sub-processes"
          tone="emerald"
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>

      <AuditWorkspace />
    </>
  );
}

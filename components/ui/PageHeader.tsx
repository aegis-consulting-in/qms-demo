import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "./DataTable";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function RestrictedNotice({ message }: { message: string }) {
  return (
    <div className="card-surface">
      <EmptyState
        icon={<Lock className="h-5 w-5" />}
        title="Restricted view"
        message={message}
      />
    </div>
  );
}

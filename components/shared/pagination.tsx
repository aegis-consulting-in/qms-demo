"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUrlParams } from "./list-toolbar";

export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const { set } = useUrlParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col items-center justify-between gap-2 border-t px-1 pt-3 text-xs text-muted-foreground sm:flex-row">
      <span>
        Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => set({ page: String(page - 1) }, false)}>
          <ChevronLeftIcon /> Prev
        </Button>
        <span className="px-2 tabular-nums">
          Page {page} / {pages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => set({ page: String(page + 1) }, false)}>
          Next <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}

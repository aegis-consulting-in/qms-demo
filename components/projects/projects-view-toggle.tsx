"use client";

import { GanttChartIcon, ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUrlParams } from "@/components/shared/list-toolbar";
import { cn } from "cn";

export function ProjectsViewToggle() {
  const { searchParams, set } = useUrlParams();
  const view = searchParams.get("view") === "gantt" ? "gantt" : "list";

  return (
    <div className="ml-auto inline-flex rounded-md border p-0.5" role="tablist" aria-label="Projects view">
      <Button
        type="button"
        size="sm"
        variant={view === "list" ? "default" : "ghost"}
        className={cn("h-7", view === "list" ? "" : "text-muted-foreground")}
        aria-pressed={view === "list"}
        onClick={() => set({ view: null }, false)}
      >
        <ListIcon />
        List
      </Button>
      <Button
        type="button"
        size="sm"
        variant={view === "gantt" ? "default" : "ghost"}
        className={cn("h-7", view === "gantt" ? "" : "text-muted-foreground")}
        aria-pressed={view === "gantt"}
        onClick={() => set({ view: "gantt" }, false)}
      >
        <GanttChartIcon />
        Gantt
      </Button>
    </div>
  );
}

"use client";

import { CheckCircle2, Flag, FolderKanban, ListTodo } from "lucide-react";
import { ProjectExplorer } from "@/components/projects/ProjectExplorer";
import { StatTile } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useQms } from "@/lib/store";
import { daysUntil, percent } from "@/lib/utils";

export default function ProjectsPage() {
  const { state } = useQms();

  const activeProjects = state.projects.filter((project) => project.status === "Active");
  const openMilestones = state.milestones.filter((milestone) => !milestone.completed);
  const overdueMilestones = openMilestones.filter((milestone) => daysUntil(milestone.dueDate) < 0);
  const completedTasks = state.tasks.filter((task) => task.status === "Completed").length;

  return (
    <>
      <PageHeader
        title="Project management"
        description="Four-level execution engine: projects, phases, milestones and tasks."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Active projects"
          value={activeProjects.length}
          hint={`${state.phases.length} phases defined`}
          icon={<FolderKanban className="h-5 w-5" />}
        />
        <StatTile
          label="Open milestones"
          value={openMilestones.length}
          hint={`${overdueMilestones.length} overdue`}
          tone={overdueMilestones.length > 0 ? "amber" : "sky"}
          icon={<Flag className="h-5 w-5" />}
        />
        <StatTile
          label="Tasks completed"
          value={`${completedTasks}/${state.tasks.length}`}
          hint={`${percent(completedTasks, state.tasks.length)}% of all work items`}
          tone="emerald"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatTile
          label="Tasks in flight"
          value={state.tasks.filter((task) => task.status === "In Progress").length}
          hint={`${state.tasks.filter((task) => task.status === "Blocked").length} blocked`}
          tone="indigo"
          icon={<ListTodo className="h-5 w-5" />}
        />
      </div>

      <ProjectExplorer />
    </>
  );
}

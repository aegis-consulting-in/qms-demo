"use client";

import { BookOpen, ClipboardCheck, GraduationCap, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { AssignTraining } from "@/components/training/AssignTraining";
import { CourseRegistry } from "@/components/training/CourseRegistry";
import { EmployeeDirectory } from "@/components/training/EmployeeDirectory";
import { ManageTraining } from "@/components/training/ManageTraining";
import { MyTraining } from "@/components/training/MyTraining";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { useQms, useSession } from "@/lib/store";

type TrainingTab = "employees" | "courses" | "assign" | "mine" | "manage";

export default function TrainingPage() {
  const { state } = useQms();
  const { isManager, currentUser } = useSession();
  const [tab, setTab] = useState<TrainingTab>("employees");

  const pendingReviews = state.assignments.filter(
    (assignment) => assignment.status === "Waiting for Approval",
  ).length;
  const myOpen = state.assignments.filter(
    (assignment) =>
      assignment.employeeId === currentUser?.id &&
      assignment.status !== "Approved",
  ).length;

  const tabs: Array<TabItem<TrainingTab>> = [
    { id: "employees", label: "Employee details", icon: <Users className="h-3.5 w-3.5" />, count: state.employees.length },
    { id: "courses", label: "Create new training", icon: <BookOpen className="h-3.5 w-3.5" />, count: state.courses.length },
    { id: "assign", label: "Create employee training", icon: <UserPlus className="h-3.5 w-3.5" />, count: state.assignments.length },
    { id: "mine", label: "My training", icon: <GraduationCap className="h-3.5 w-3.5" />, count: myOpen },
    {
      id: "manage",
      label: "Manage training",
      icon: <ClipboardCheck className="h-3.5 w-3.5" />,
      count: isManager ? pendingReviews : undefined,
    },
  ];

  return (
    <>
      <PageHeader
        title="Training management"
        description="HR master data, the course registry, assignments, employee self-service and the manager approval queue."
      />
      <Tabs items={tabs} value={tab} onChange={setTab} className="mb-4" />

      {tab === "employees" ? <EmployeeDirectory /> : null}
      {tab === "courses" ? <CourseRegistry /> : null}
      {tab === "assign" ? <AssignTraining /> : null}
      {tab === "mine" ? <MyTraining /> : null}
      {tab === "manage" ? <ManageTraining /> : null}
    </>
  );
}

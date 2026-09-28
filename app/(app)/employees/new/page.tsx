import type { Metadata } from "next";
import { EmployeeForm } from "@/components/employees/employee-form";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getDepartments, getEmployeeOptions, getJobTitles } from "@/lib/data/master";

export const metadata: Metadata = { title: "New employee" };

export default async function NewEmployeePage() {
  await requirePagePermission(PERMISSIONS.employee.create);
  const [departments, jobTitles, employees] = await Promise.all([getDepartments(), getJobTitles(), getEmployeeOptions()]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="New employee" crumbs={[{ label: "Employees", href: "/employees" }, { label: "New" }]} />
      <Section>
        <EmployeeForm departments={departments} jobTitles={jobTitles} managers={employees.filter((e) => e.is_manager)} />
      </Section>
    </div>
  );
}

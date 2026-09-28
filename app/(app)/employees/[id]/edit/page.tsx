import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmployeeForm } from "@/components/employees/employee-form";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getEmployee } from "@/lib/data/employees";
import { getDepartments, getEmployeeOptions, getJobTitles } from "@/lib/data/master";

export const metadata: Metadata = { title: "Edit employee" };

export default async function EditEmployeePage({ params }: PageProps<"/employees/[id]/edit">) {
  await requirePagePermission(PERMISSIONS.employee.edit);
  const { id } = await params;
  const [employee, departments, jobTitles, employees] = await Promise.all([
    getEmployee(id),
    getDepartments(),
    getJobTitles(),
    getEmployeeOptions(),
  ]);
  if (!employee) notFound();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Edit ${employee.first_name} ${employee.last_name}`}
        crumbs={[
          { label: "Employees", href: "/employees" },
          { label: `${employee.first_name} ${employee.last_name}`, href: `/employees/${employee.id}` },
          { label: "Edit" },
        ]}
      />
      <Section>
        <EmployeeForm employee={employee} departments={departments} jobTitles={jobTitles} managers={employees.filter((e) => e.is_manager)} />
      </Section>
    </div>
  );
}

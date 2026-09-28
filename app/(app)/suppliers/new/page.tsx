import type { Metadata } from "next";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getDepartments } from "@/lib/data/master";
import { getSupplierCategories } from "@/lib/data/suppliers";

export const metadata: Metadata = { title: "New supplier" };

export default async function NewSupplierPage() {
  await requirePagePermission(PERMISSIONS.supplier.create);
  const [departments, categories] = await Promise.all([getDepartments(), getSupplierCategories()]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="New supplier" crumbs={[{ label: "Suppliers", href: "/suppliers" }, { label: "New" }]} />
      <Section>
        <SupplierForm departments={departments} categories={categories} />
      </Section>
    </div>
  );
}

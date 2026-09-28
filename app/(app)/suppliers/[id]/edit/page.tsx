import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getDepartments } from "@/lib/data/master";
import { getSupplier, getSupplierCategories } from "@/lib/data/suppliers";

export const metadata: Metadata = { title: "Edit supplier" };

export default async function EditSupplierPage({ params }: PageProps<"/suppliers/[id]/edit">) {
  await requirePagePermission(PERMISSIONS.supplier.edit);
  const { id } = await params;
  const [supplier, departments, categories] = await Promise.all([getSupplier(id), getDepartments(), getSupplierCategories()]);
  if (!supplier) notFound();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={`Edit ${supplier.name}`} crumbs={[{ label: "Suppliers", href: "/suppliers" }, { label: supplier.name, href: `/suppliers/${supplier.id}` }, { label: "Edit" }]} />
      <Section>
        <SupplierForm supplier={supplier} departments={departments} categories={categories} />
      </Section>
    </div>
  );
}

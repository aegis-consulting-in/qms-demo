import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentsPanel } from "@/components/documents/documents-panel";
import { DetailList } from "@/components/shared/data-table";
import { EntityActions } from "@/components/shared/entity-actions";
import { PageHeader, Section } from "@/components/shared/page-header";
import { BooleanBadge, StatusBadge } from "@/components/shared/status-badge";
import { deleteSupplierAction } from "@/lib/actions/suppliers";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSupplier } from "@/lib/data/suppliers";
import { formatDate, formatDateTime, isOverdue } from "@/lib/format";

export const metadata: Metadata = { title: "Supplier" };

export default async function SupplierDetailPage({ params }: PageProps<"/suppliers/[id]">) {
  const user = await requirePagePermission(PERMISSIONS.supplier.view);
  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) notFound();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {supplier.name}
            <StatusBadge status={supplier.status} />
          </span>
        }
        description={[supplier.code, supplier.category].filter(Boolean).join(" · ")}
        crumbs={[{ label: "Suppliers", href: "/suppliers" }, { label: supplier.name }]}
        actions={
          <EntityActions
            id={supplier.id}
            editHref={`/suppliers/${supplier.id}/edit`}
            canEdit={user.can(PERMISSIONS.supplier.edit)}
            canDelete={user.can(PERMISSIONS.supplier.delete)}
            deleteAction={deleteSupplierAction}
            deleteTitle="Delete this supplier?"
            deleteDescription="The supplier will be archived and hidden from the register. Documents are kept."
            afterDeleteHref="/suppliers"
          />
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title="Supplier details" className="lg:col-span-2">
          <DetailList
            items={[
              { label: "Contact person", value: supplier.contact_person ?? "—" },
              { label: "Email", value: supplier.email ? <a href={`mailto:${supplier.email}`} className="hover:underline">{supplier.email}</a> : "—" },
              { label: "Phone", value: supplier.phone ?? "—" },
              { label: "Department served", value: supplier.department?.name ?? "—" },
              { label: "Service / product", value: supplier.service_supplied ?? "—" },
              { label: "Address", value: supplier.address ?? "—" },
              { label: "Notes", value: supplier.notes ?? "—" },
            ]}
          />
        </Section>
        <Section title="Evaluation">
          <DetailList
            className="sm:grid-cols-1"
            items={[
              { label: "Evaluation complete", value: <BooleanBadge value={supplier.evaluation_complete} /> },
              {
                label: "Review due",
                value: <span className={isOverdue(supplier.review_due_date) ? "font-medium text-destructive" : undefined}>{formatDate(supplier.review_due_date)}</span>,
              },
              { label: "Rating", value: supplier.rating != null ? `${supplier.rating} / 5` : "—" },
              { label: "Created", value: formatDateTime(supplier.created_at) },
              { label: "Updated", value: formatDateTime(supplier.updated_at) },
            ]}
          />
        </Section>
      </div>

      <DocumentsPanel module="supplier" entityId={supplier.id} title="Supplier documents" />
    </div>
  );
}

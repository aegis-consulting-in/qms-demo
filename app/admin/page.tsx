"use client";

import {
  BellRing,
  Check,
  Database,
  Mail,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserCog,
} from "lucide-react";
import { useMemo, useState } from "react";
import { roleOptions } from "@/lib/navigation";
import { useQms, useSession } from "@/lib/store";
import type { ReminderChannel, ReminderModule, ReminderRule, UserRole } from "@/lib/types";
import { createId, cx, daysUntil, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/DataTable";
import { Field, FormGrid, Input, Select, Toggle } from "@/components/ui/Form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { PageHeader, RestrictedNotice } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";

const modules: ReminderModule[] = ["Training", "PPM", "Supplier", "Project", "Audit"];
const channels: ReminderChannel[] = ["Email", "In-App", "Email + In-App"];
const leadDayPresets = [1, 2, 3, 7, 14, 30];

export default function AdminPage() {
  const { state, add, update, remove, setSession, resetData } = useQms();
  const { role, isAdmin, currentUser } = useSession();
  const toast = useToast();

  const [editing, setEditing] = useState<ReminderRule | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<ReminderRule | null>(null);
  const [resetting, setResetting] = useState(false);

  const grouped = useMemo(
    () =>
      modules
        .map((module) => ({
          module,
          rules: state.reminders.filter((reminder) => reminder.module === module),
        }))
        .filter((group) => group.rules.length > 0),
    [state.reminders],
  );

  // Preview which records would trigger a notification under the enabled rules today.
  const preview = useMemo(() => {
    const items: Array<{ id: string; module: ReminderModule; subject: string; lead: number; due: string }> = [];
    state.reminders
      .filter((reminder) => reminder.enabled)
      .forEach((reminder) => {
        if (reminder.module === "Training") {
          state.assignments
            .filter((assignment) => assignment.status !== "Approved")
            .forEach((assignment) => {
              const days = daysUntil(assignment.dueDate);
              if (days >= 0 && days <= reminder.leadDays) {
                const course = state.courses.find((item) => item.id === assignment.courseId);
                const employee = state.employees.find((item) => item.id === assignment.employeeId);
                items.push({
                  id: `${reminder.id}-${assignment.id}`,
                  module: "Training",
                  subject: `${course?.code ?? "Course"} — ${employee?.name ?? "Employee"}`,
                  lead: reminder.leadDays,
                  due: assignment.dueDate,
                });
              }
            });
        }
        if (reminder.module === "PPM") {
          state.assets
            .filter((asset) => asset.status === "Active")
            .forEach((asset) => {
              const days = daysUntil(asset.dueDate);
              if (days >= 0 && days <= reminder.leadDays) {
                items.push({
                  id: `${reminder.id}-${asset.id}`,
                  module: "PPM",
                  subject: `${asset.serialNumber} — ${asset.name}`,
                  lead: reminder.leadDays,
                  due: asset.dueDate,
                });
              }
            });
        }
        if (reminder.module === "Supplier") {
          state.suppliers
            .filter((supplier) => supplier.status === "Active")
            .forEach((supplier) => {
              const days = daysUntil(supplier.dueDate);
              if (days >= 0 && days <= reminder.leadDays) {
                items.push({
                  id: `${reminder.id}-${supplier.id}`,
                  module: "Supplier",
                  subject: supplier.name,
                  lead: reminder.leadDays,
                  due: supplier.dueDate,
                });
              }
            });
        }
        if (reminder.module === "Audit") {
          state.audits
            .filter((audit) => audit.status === "Active")
            .forEach((audit) => {
              const days = daysUntil(audit.auditDate);
              if (days >= 0 && days <= reminder.leadDays) {
                items.push({
                  id: `${reminder.id}-${audit.id}`,
                  module: "Audit",
                  subject: audit.processName,
                  lead: reminder.leadDays,
                  due: audit.auditDate,
                });
              }
            });
        }
      });
    return items
      .filter(
        (item, index, all) => all.findIndex((other) => other.subject === item.subject) === index,
      )
      .sort((a, b) => daysUntil(a.due) - daysUntil(b.due));
  }, [state]);

  if (!isAdmin) {
    return (
      <>
        <PageHeader
          title="Admin settings"
          description="Role simulation, reminder rules and local data controls."
        />
        <RestrictedNotice message="Admin Settings are only available to the System Admin role. Use the role menu in the header to switch." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Admin settings"
        description="Simulate workflow permissions and configure the mock reminder engine."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="User role switcher"
            description="Changes which actions, tabs and modules are available across the app"
            icon={<UserCog className="h-4 w-4" />}
          />
          <CardBody className="space-y-3">
            {roleOptions.map((option) => {
              const active = option.role === role;
              return (
                <button
                  key={option.role}
                  type="button"
                  onClick={() => {
                    setSession({ role: option.role as UserRole });
                    toast.push(`Now browsing as ${option.role}.`, "info");
                  }}
                  className={cx(
                    "w-full rounded-xl p-3.5 text-left ring-1 ring-inset transition-all",
                    active
                      ? "bg-indigo-50 ring-indigo-300"
                      : "bg-white ring-slate-200 hover:ring-slate-300",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <ShieldCheck
                        className={cx("h-4 w-4", active ? "text-indigo-600" : "text-slate-400")}
                      />
                      {option.role}
                    </span>
                    {active ? (
                      <Badge tone="indigo" dot>
                        Active
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{option.summary}</p>
                  <ul className="mt-2 space-y-1">
                    {option.capabilities.map((capability) => (
                      <li key={capability} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                        {capability}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}

            <div className="border-t border-slate-200 pt-3">
              <Field label="Signed-in employee" hint="Drives the My Training view and audit trail names">
                <Select
                  value={state.session.employeeId}
                  onChange={(event) => setSession({ employeeId: event.target.value })}
                >
                  {state.employees
                    .filter((employee) => employee.status === "Active")
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} — {employee.jobRole} ({employee.department})
                      </option>
                    ))}
                </Select>
              </Field>
              <p className="mt-2 text-xs text-slate-500">
                Currently acting as <span className="font-semibold text-slate-700">{currentUser?.name}</span>{" "}
                with the <span className="font-semibold text-slate-700">{role}</span> role.
              </p>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Reminder alerts configurator"
              description="Mock notification rules for due dates across the modules"
              icon={<BellRing className="h-4 w-4" />}
              actions={
                <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing(null)}>
                  Add rule
                </Button>
              }
            />
            {grouped.length === 0 ? (
              <EmptyState title="No reminder rules" message="Add a rule to simulate advance notifications." />
            ) : (
              <div className="divide-y divide-slate-100">
                {grouped.map((group) => (
                  <div key={group.module} className="px-4 py-3 sm:px-5">
                    <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                      {group.module}
                    </p>
                    <ul className="space-y-2">
                      {group.rules.map((rule) => (
                        <li
                          key={rule.id}
                          className={cx(
                            "rounded-xl px-3 py-2.5 ring-1 ring-inset transition-colors",
                            rule.enabled ? "bg-white ring-slate-200" : "bg-slate-50 ring-slate-200",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p
                                className={cx(
                                  "truncate text-sm font-medium",
                                  rule.enabled ? "text-slate-900" : "text-slate-400",
                                )}
                              >
                                {rule.event}
                              </p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                <Badge tone={rule.leadDays >= 14 ? "violet" : "indigo"}>
                                  {rule.leadDays === 7
                                    ? "1 week"
                                    : rule.leadDays === 14
                                      ? "2 weeks"
                                      : `${rule.leadDays} days`}{" "}
                                  before
                                </Badge>
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {rule.channel}
                                </span>
                                <span>· {rule.recipients}</span>
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <IconButton
                                label="Edit rule"
                                icon={<Pencil className="h-4 w-4" />}
                                onClick={() => setEditing(rule)}
                              />
                              <IconButton
                                label="Delete rule"
                                icon={<Trash2 className="h-4 w-4" />}
                                className="hover:bg-rose-50 hover:text-rose-600"
                                onClick={() => setDeleting(rule)}
                              />
                            </div>
                          </div>
                          <div className="mt-2 border-t border-slate-100 pt-2">
                            <Toggle
                              label={rule.enabled ? "Enabled" : "Disabled"}
                              checked={rule.enabled}
                              onChange={(next) => {
                                update("reminders", rule.id, { enabled: next });
                                toast.push(
                                  `${rule.event} reminder ${next ? "enabled" : "disabled"}.`,
                                  "info",
                                );
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Notifications that would fire today"
              description="Simulated against the current records and enabled rules"
              icon={<Mail className="h-4 w-4" />}
            />
            {preview.length === 0 ? (
              <EmptyState
                title="No reminders due"
                message="Nothing falls inside an enabled reminder window right now."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {preview.slice(0, 8).map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                    <Badge tone="indigo">{item.module}</Badge>
                    <p className="min-w-0 flex-1 truncate text-xs text-slate-700">{item.subject}</p>
                    <span className="shrink-0 text-[11px] text-slate-500">
                      due {formatDate(item.due)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Local data"
              description="Everything lives in this browser's localStorage"
              icon={<Database className="h-4 w-4" />}
            />
            <CardBody className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                {[
                  ["Employees", state.employees.length],
                  ["Courses", state.courses.length],
                  ["Assignments", state.assignments.length],
                  ["Assets", state.assets.length],
                  ["Work orders", state.maintenanceRequests.length],
                  ["Suppliers", state.suppliers.length],
                  ["Projects", state.projects.length],
                  ["Audits", state.audits.length],
                ].map(([label, count]) => (
                  <div key={label} className="rounded-lg bg-slate-50 px-2.5 py-2">
                    <p className="text-slate-500">{label}</p>
                    <p className="text-sm font-semibold text-slate-900">{count}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Uploaded files are held as browser object URLs for the current session; their metadata is
                persisted so records stay intact after a reload.
              </p>
              <div className="flex justify-end border-t border-slate-200 pt-3">
                <Button
                  variant="danger"
                  size="sm"
                  icon={<RotateCcw className="h-3.5 w-3.5" />}
                  onClick={() => setResetting(true)}
                >
                  Reset to demo data
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {editing !== undefined ? (
        <ReminderForm
          rule={editing}
          onClose={() => setEditing(undefined)}
          onSave={(rule) => {
            if (editing) {
              update("reminders", rule.id, rule);
              toast.push("Reminder rule updated.");
            } else {
              add("reminders", rule);
              toast.push("Reminder rule created.");
            }
            setEditing(undefined);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete reminder rule"
        confirmLabel="Delete"
        message={<>The rule “{deleting?.event}” will be removed from the notification engine.</>}
        onConfirm={() => {
          if (!deleting) return;
          remove("reminders", deleting.id);
          toast.push("Reminder rule deleted.", "info");
        }}
      />

      <ConfirmDialog
        open={resetting}
        onClose={() => setResetting(false)}
        title="Reset to demo data"
        confirmLabel="Reset everything"
        message="All records you created in this browser will be replaced by the original mock data set. This cannot be undone."
        onConfirm={() => {
          resetData();
          toast.push("Local data reset to the demo fixtures.", "info");
        }}
      />
    </>
  );
}

function ReminderForm({
  rule,
  onClose,
  onSave,
}: {
  rule: ReminderRule | null;
  onClose: () => void;
  onSave: (rule: ReminderRule) => void;
}) {
  const [form, setForm] = useState({
    module: rule?.module ?? ("Training" as ReminderModule),
    event: rule?.event ?? "",
    leadDays: String(rule?.leadDays ?? 7),
    channel: rule?.channel ?? ("Email" as ReminderChannel),
    recipients: rule?.recipients ?? "",
    enabled: rule?.enabled ?? true,
  });
  const [error, setError] = useState("");

  return (
    <Modal
      open
      onClose={onClose}
      title={rule ? "Edit reminder rule" : "Add reminder rule"}
      description="Rules are simulated locally — no email is actually sent."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.event.trim()) {
                setError("Describe the event that triggers this reminder");
                return;
              }
              onSave({
                id: rule?.id ?? createId("rem"),
                module: form.module,
                event: form.event.trim(),
                leadDays: Number(form.leadDays) || 1,
                channel: form.channel,
                recipients: form.recipients.trim() || "Record owner",
                enabled: form.enabled,
              });
            }}
          >
            Save rule
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormGrid>
          <Field label="Module">
            <Select
              value={form.module}
              onChange={(event) => setForm({ ...form, module: event.target.value as ReminderModule })}
            >
              {modules.map((module) => (
                <option key={module}>{module}</option>
              ))}
            </Select>
          </Field>
          <Field label="Advance notice (days)" hint="7 = one week, 14 = two weeks">
            <Select
              value={form.leadDays}
              onChange={(event) => setForm({ ...form, leadDays: event.target.value })}
            >
              {leadDayPresets.map((days) => (
                <option key={days} value={days}>
                  {days === 7 ? "7 (1 week)" : days === 14 ? "14 (2 weeks)" : days}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Trigger event" required error={error} className="sm:col-span-2">
            <Input
              value={form.event}
              placeholder="Preventive maintenance due date approaching"
              onChange={(event) => {
                setForm({ ...form, event: event.target.value });
                setError("");
              }}
            />
          </Field>
          <Field label="Channel">
            <Select
              value={form.channel}
              onChange={(event) => setForm({ ...form, channel: event.target.value as ReminderChannel })}
            >
              {channels.map((channel) => (
                <option key={channel}>{channel}</option>
              ))}
            </Select>
          </Field>
          <Field label="Recipients">
            <Input
              value={form.recipients}
              placeholder="Assignee, Reporting Manager"
              onChange={(event) => setForm({ ...form, recipients: event.target.value })}
            />
          </Field>
        </FormGrid>
        <div className="border-t border-slate-200 pt-4">
          <Toggle
            label="Rule enabled"
            description="Disabled rules stay configured but never fire."
            checked={form.enabled}
            onChange={(next) => setForm({ ...form, enabled: next })}
          />
        </div>
      </div>
    </Modal>
  );
}

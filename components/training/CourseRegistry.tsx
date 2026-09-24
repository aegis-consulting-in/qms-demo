"use client";

import {
  BookOpen,
  Download,
  FileSpreadsheet,
  Pencil,
  Plus,
  ToggleLeft,
  ToggleRight,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useQms, useSession } from "@/lib/store";
import type { RecordStatus, TrainingCourse, TrainingFrequency } from "@/lib/types";
import { createId, matchesQuery, nowIso } from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CellStack, DataTable, EmptyState, RowActions, type Column } from "@/components/ui/DataTable";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/Form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { FilterBar, SearchInput, StatusFilterTabs, type StatusFilterValue } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";

const frequencies: TrainingFrequency[] = ["Monthly", "Quarterly", "Half-Yearly", "Annual", "One-Time"];

interface CourseForm {
  code: string;
  title: string;
  description: string;
  frequency: TrainingFrequency;
  durationHours: string;
  status: RecordStatus;
}

const blankForm: CourseForm = {
  code: "",
  title: "",
  description: "",
  frequency: "Annual",
  durationHours: "2",
  status: "Active",
};

interface ImportRow {
  code: string;
  title: string;
  description: string;
  frequency: TrainingFrequency;
  durationHours: number;
  issue?: string;
}

const templateHeader = "Training Code,Title,Description,Frequency,Duration (hours)";

const simulatedSheet: Array<Omit<ImportRow, "issue">> = [
  {
    code: "TRN-CAPA-05",
    title: "CAPA Investigation & Root Cause Analysis",
    description: "5-Why and fishbone technique for corrective action owners.",
    frequency: "Annual",
    durationHours: 6,
  },
  {
    code: "TRN-CLN-02",
    title: "Cleanroom Gowning Qualification",
    description: "Aseptic gowning sequence and re-qualification criteria.",
    frequency: "Half-Yearly",
    durationHours: 3,
  },
  {
    code: "TRN-DI-09",
    title: "Data Integrity & ALCOA+",
    description: "Attributable, legible, contemporaneous, original and accurate records.",
    frequency: "Annual",
    durationHours: 4,
  },
  {
    code: "TRN-EHS-11",
    title: "Emergency Response & Spill Control",
    description: "Chemical spill kits, evacuation routes and reporting duties.",
    frequency: "Quarterly",
    durationHours: 2,
  },
  {
    code: "TRN-SOP-14",
    title: "SOP-14 Document Control",
    description: "Duplicate row kept to demonstrate validation on import.",
    frequency: "Quarterly",
    durationHours: 2,
  },
];

function normaliseFrequency(value: string): TrainingFrequency {
  const match = frequencies.find((frequency) => frequency.toLowerCase() === value.trim().toLowerCase());
  return match ?? "Annual";
}

function parseCsv(text: string): Array<Omit<ImportRow, "issue">> {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.toLowerCase().startsWith("training code"))
    .map((line) => {
      const cells = line.split(",").map((cell) => cell.trim());
      return {
        code: cells[0] ?? "",
        title: cells[1] ?? "",
        description: cells[2] ?? "",
        frequency: normaliseFrequency(cells[3] ?? ""),
        durationHours: Number(cells[4]) || 1,
      };
    })
    .filter((row) => row.code && row.title);
}

export function CourseRegistry() {
  const { state, add, update } = useQms();
  const { isManager } = useSession();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("Active");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingCourse | null>(null);
  const [form, setForm] = useState<CourseForm>(blankForm);
  const [errors, setErrors] = useState<Partial<Record<keyof CourseForm, string>>>({});
  const [toggling, setToggling] = useState<TrainingCourse | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[] | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(
    () => ({
      All: state.courses.length,
      Active: state.courses.filter((course) => course.status === "Active").length,
      Inactive: state.courses.filter((course) => course.status === "Inactive").length,
    }),
    [state.courses],
  );

  const rows = useMemo(
    () =>
      state.courses.filter(
        (course) =>
          (statusFilter === "All" || course.status === statusFilter) &&
          matchesQuery(query, course.code, course.title, course.description, course.frequency),
      ),
    [state.courses, statusFilter, query],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (course: TrainingCourse) => {
    setEditing(course);
    setForm({
      code: course.code,
      title: course.title,
      description: course.description,
      frequency: course.frequency,
      durationHours: String(course.durationHours),
      status: course.status,
    });
    setErrors({});
    setFormOpen(true);
  };

  const submit = () => {
    const nextErrors: Partial<Record<keyof CourseForm, string>> = {};
    if (!form.code.trim()) nextErrors.code = "Training code is required";
    if (!form.title.trim()) nextErrors.title = "Title is required";
    if (!form.description.trim()) nextErrors.description = "Add a short description";
    const duplicate = state.courses.find(
      (course) => course.code.toLowerCase() === form.code.trim().toLowerCase() && course.id !== editing?.id,
    );
    if (duplicate) nextErrors.code = "This training code already exists";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      description: form.description.trim(),
      frequency: form.frequency,
      durationHours: Number(form.durationHours) || 1,
      status: form.status,
    };

    if (editing) {
      update("courses", editing.id, payload);
      toast.push(`${payload.code} updated.`);
    } else {
      add("courses", { id: createId("crs"), createdAt: nowIso(), ...payload });
      toast.push(`${payload.code} added to the course registry.`);
    }
    setFormOpen(false);
  };

  const validateImport = (parsed: Array<Omit<ImportRow, "issue">>): ImportRow[] => {
    const seen = new Set<string>();
    return parsed.map((row) => {
      const key = row.code.toLowerCase();
      let issue: string | undefined;
      if (state.courses.some((course) => course.code.toLowerCase() === key)) {
        issue = "Already in registry — will be skipped";
      } else if (seen.has(key)) {
        issue = "Duplicate row in file — will be skipped";
      }
      seen.add(key);
      return { ...row, issue };
    });
  };

  const handleImportFile = async (file: File) => {
    setImportFileName(file.name);
    const isText = file.type.startsWith("text/") || /\.(csv|txt)$/i.test(file.name);
    const parsed = isText ? parseCsv(await file.text()) : simulatedSheet;
    setImportRows(validateImport(parsed.length > 0 ? parsed : simulatedSheet));
  };

  const loadSampleSheet = () => {
    setImportFileName("training-master-list.xlsx");
    setImportRows(validateImport(simulatedSheet));
  };

  const downloadTemplate = () => {
    const csv = [
      templateHeader,
      "TRN-XXX-01,Example course title,What the course covers,Annual,4",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "training-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.push("Import template downloaded.", "info");
  };

  const confirmImport = () => {
    if (!importRows) return;
    const importable = importRows.filter((row) => !row.issue);
    importable.forEach((row) => {
      add("courses", {
        id: createId("crs"),
        code: row.code.toUpperCase(),
        title: row.title,
        description: row.description,
        frequency: row.frequency,
        durationHours: row.durationHours,
        status: "Active",
        createdAt: nowIso(),
        importedFrom: importFileName,
      });
    });
    const skipped = importRows.length - importable.length;
    toast.push(
      `Imported ${importable.length} course${importable.length === 1 ? "" : "s"}${
        skipped > 0 ? ` · ${skipped} skipped` : ""
      }.`,
      importable.length > 0 ? "success" : "warning",
    );
    setImportOpen(false);
    setImportRows(null);
    setImportFileName("");
  };

  const columns: Array<Column<TrainingCourse>> = [
    {
      key: "course",
      header: "Training",
      render: (course) => <CellStack primary={course.title} secondary={course.code} />,
    },
    {
      key: "description",
      header: "Description",
      hideBelow: "lg",
      render: (course) => (
        <p className="max-w-md truncate text-sm text-slate-600">{course.description}</p>
      ),
    },
    {
      key: "frequency",
      header: "Frequency",
      render: (course) => <Badge tone="indigo">{course.frequency}</Badge>,
    },
    {
      key: "duration",
      header: "Duration",
      hideBelow: "md",
      render: (course) => <span className="text-sm">{course.durationHours}h</span>,
    },
    {
      key: "assigned",
      header: "Assigned",
      hideBelow: "md",
      align: "center",
      render: (course) => (
        <span className="text-sm font-semibold text-slate-700">
          {state.assignments.filter((assignment) => assignment.courseId === course.id).length}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (course) => <StatusBadge status={course.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (course) =>
        isManager ? (
          <RowActions>
            <IconButton
              label={`Edit ${course.code}`}
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => openEdit(course)}
            />
            <IconButton
              label={course.status === "Active" ? "Deactivate course" : "Reactivate course"}
              icon={
                course.status === "Active" ? (
                  <ToggleRight className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ToggleLeft className="h-4 w-4 text-slate-400" />
                )
              }
              onClick={() => setToggling(course)}
            />
          </RowActions>
        ) : null,
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Create new training"
        description="Course registry that feeds every employee training assignment"
        icon={<BookOpen className="h-4 w-4" />}
        actions={
          isManager ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                icon={<FileSpreadsheet className="h-4 w-4" />}
                onClick={() => setImportOpen(true)}
              >
                Excel bulk import
              </Button>
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                New training
              </Button>
            </>
          ) : null
        }
      />
      <FilterBar>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by code, title or description…"
          className="sm:w-80"
        />
        <StatusFilterTabs value={statusFilter} onChange={setStatusFilter} counts={counts} />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        emptyTitle="No courses match this filter"
        emptyMessage="Create a course manually or bulk import from a spreadsheet."
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.code}` : "Create new training"}
        description="Courses define the recurrence used when assigning training to employees."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>{editing ? "Save changes" : "Create training"}</Button>
          </>
        }
      >
        <FormGrid>
          <Field label="Training code" required error={errors.code}>
            <Input
              value={form.code}
              placeholder="TRN-GMP-02"
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
          </Field>
          <Field label="Title" required error={errors.title}>
            <Input
              value={form.title}
              placeholder="Deviation Handling Essentials"
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </Field>
          <Field label="Frequency" required>
            <Select
              value={form.frequency}
              onChange={(event) =>
                setForm({ ...form, frequency: event.target.value as TrainingFrequency })
              }
            >
              {frequencies.map((frequency) => (
                <option key={frequency}>{frequency}</option>
              ))}
            </Select>
          </Field>
          <Field label="Duration (hours)">
            <Input
              type="number"
              min={1}
              value={form.durationHours}
              onChange={(event) => setForm({ ...form, durationHours: event.target.value })}
            />
          </Field>
          <Field label="Description" required error={errors.description} className="sm:col-span-2">
            <Textarea
              value={form.description}
              rows={3}
              placeholder="What the course covers and who must attend."
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as RecordStatus })}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </Field>
        </FormGrid>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          setImportRows(null);
        }}
        title="Excel bulk import"
        description="Pick a spreadsheet to stage rows, review the validation result, then commit the import."
        size="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" icon={<Download className="h-4 w-4" />} onClick={downloadTemplate}>
              Download template
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setImportOpen(false);
                setImportRows(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmImport}
              disabled={!importRows || importRows.every((row) => Boolean(row.issue))}
            >
              Import {importRows ? importRows.filter((row) => !row.issue).length : 0} courses
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center">
            <FileSpreadsheet className="mx-auto h-6 w-6 text-emerald-600" />
            <p className="mt-1.5 text-sm font-semibold text-slate-700">
              Upload the training master list
            </p>
            <p className="mx-auto mt-0.5 max-w-sm text-xs text-slate-500">
              CSV files are parsed for real. Any .xlsx selection is staged with the demo sheet, since
              spreadsheet parsing would need a server-side library.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Upload className="h-3.5 w-3.5" />}
                onClick={() => importInputRef.current?.click()}
              >
                Choose file
              </Button>
              <Button variant="ghost" size="sm" onClick={loadSampleSheet}>
                Use demo sheet
              </Button>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.txt,.xls,.xlsx"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImportFile(file);
                event.target.value = "";
              }}
            />
          </div>

          {importRows ? (
            <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-700">{importFileName}</p>
                <div className="flex items-center gap-2">
                  <Badge tone="emerald">{importRows.filter((row) => !row.issue).length} ready</Badge>
                  {importRows.some((row) => row.issue) ? (
                    <Badge tone="amber">{importRows.filter((row) => row.issue).length} skipped</Badge>
                  ) : null}
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                      <th className="px-3 py-2 text-left">Code</th>
                      <th className="px-3 py-2 text-left">Title</th>
                      <th className="hidden px-3 py-2 text-left sm:table-cell">Frequency</th>
                      <th className="px-3 py-2 text-left">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importRows.map((row, index) => (
                      <tr key={`${row.code}-${index}`} className={row.issue ? "bg-amber-50/50" : undefined}>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.code}</td>
                        <td className="px-3 py-2 text-slate-800">{row.title}</td>
                        <td className="hidden px-3 py-2 sm:table-cell">
                          <Badge tone="indigo">{row.frequency}</Badge>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {row.issue ? (
                            <span className="text-amber-700">{row.issue}</span>
                          ) : (
                            <span className="text-emerald-700">Ready to import</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<FileSpreadsheet className="h-5 w-5" />}
              title="No file staged"
              message="Choose a spreadsheet or load the demo sheet to preview the rows before importing."
            />
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(toggling)}
        onClose={() => setToggling(null)}
        title={toggling?.status === "Active" ? "Deactivate course" : "Reactivate course"}
        tone={toggling?.status === "Active" ? "danger" : "primary"}
        confirmLabel={toggling?.status === "Active" ? "Deactivate" : "Reactivate"}
        message={
          <>
            <strong>{toggling?.title}</strong>{" "}
            {toggling?.status === "Active"
              ? "will be hidden from new assignments. Existing assignments keep their history."
              : "will become available for new assignments again."}
          </>
        }
        onConfirm={() => {
          if (!toggling) return;
          const next: RecordStatus = toggling.status === "Active" ? "Inactive" : "Active";
          update("courses", toggling.id, { status: next });
          toast.push(`${toggling.code} is now ${next.toLowerCase()}.`, "info");
        }}
      />
    </Card>
  );
}

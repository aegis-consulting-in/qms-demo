export type RecordStatus = "Active" | "Inactive";

export type UserRole = "Standard Employee" | "Manager" | "System Admin";

export interface DocumentRef {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  /** Free-form tag used by the PPM repository and audit evidence views. */
  category?: string;
  /** Present only for fixture documents that were never backed by a real File. */
  seeded?: boolean;
}

/* ------------------------------- Training -------------------------------- */

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  email: string;
  jobRole: string;
  reportsTo?: string;
  status: RecordStatus;
  createdAt: string;
}

export type TrainingFrequency = "Monthly" | "Quarterly" | "Half-Yearly" | "Annual" | "One-Time";

export interface TrainingCourse {
  id: string;
  code: string;
  title: string;
  description: string;
  frequency: TrainingFrequency;
  durationHours: number;
  status: RecordStatus;
  createdAt: string;
  importedFrom?: string;
}

export type TrainingProgressStatus =
  | "Pending"
  | "In Progress"
  | "Waiting for Approval"
  | "Approved"
  | "Rejected";

export interface TrainingHistoryEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  note?: string;
}

export interface TrainingAssignment {
  id: string;
  courseId: string;
  employeeId: string;
  assignedBy: string;
  startDate: string;
  dueDate: string;
  status: TrainingProgressStatus;
  startedAt?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewComments?: string;
  score?: number;
  documents: DocumentRef[];
  history: TrainingHistoryEntry[];
}

/* --------------------------- Preventive maintenance ---------------------- */

export type MaintenanceState =
  | "Scheduled"
  | "Due Soon"
  | "Overdue"
  | "In Progress"
  | "Completed";

export interface Asset {
  id: string;
  serialNumber: string;
  name: string;
  category: string;
  location: string;
  manufacturer: string;
  ppmStartDate: string;
  dueDate: string;
  frequency: TrainingFrequency;
  maintenanceState: MaintenanceState;
  status: RecordStatus;
  documents: DocumentRef[];
  createdAt: string;
}

export type MaintenanceType = "Preventive" | "Routine" | "Corrective" | "Calibration";
export type MaintenanceRequestStatus = "Open" | "In Progress" | "Completed" | "Cancelled";

export interface MaintenanceRequest {
  id: string;
  assetId: string;
  type: MaintenanceType;
  raisedBy: string;
  technician: string;
  scheduledDate: string;
  completedDate?: string;
  description: string;
  findings?: string;
  downtimeHours?: number;
  status: MaintenanceRequestStatus;
  documents: DocumentRef[];
  createdAt: string;
}

/* ------------------------------- Suppliers ------------------------------- */

export interface Supplier {
  id: string;
  name: string;
  department: string;
  serviceSupplied: boolean;
  contactPerson: string;
  phone: string;
  email: string;
  dueDate: string;
  rating: number;
  status: RecordStatus;
  createdAt: string;
}

/* ------------------------------- Projects -------------------------------- */

export interface Project {
  id: string;
  code: string;
  name: string;
  owner: string;
  description: string;
  startDate: string;
  expectedCompletionDate: string;
  status: RecordStatus;
  createdAt: string;
}

export interface ProjectPhase {
  id: string;
  projectId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: RecordStatus;
  createdAt: string;
}

export interface ProjectMilestone {
  id: string;
  phaseId: string;
  name: string;
  description: string;
  dueDate: string;
  completed: boolean;
  createdAt: string;
}

export type TaskStatus = "To Do" | "In Progress" | "Blocked" | "Completed";

export interface ProjectTask {
  id: string;
  milestoneId: string;
  title: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  status: TaskStatus;
  createdAt: string;
}

/* --------------------------------- Audits -------------------------------- */

export interface Audit {
  id: string;
  processName: string;
  responsibility: string;
  clauses: string[];
  inputs: string;
  activities: string;
  outputs: string;
  solidData: string;
  auditors: string[];
  auditDate: string;
  status: RecordStatus;
  createdAt: string;
}

export interface AuditKpi {
  id: string;
  name: string;
  unit: string;
  target: number;
  actual: number;
  period: string;
}

export type ComplianceVerdict = "Compliant" | "Minor NC" | "Major NC" | "Not Applicable";

export interface ClauseCheck {
  id: string;
  clause: string;
  requirement: string;
  verdict: ComplianceVerdict;
  notes: string;
}

export interface EffectivenessEvaluation {
  comments: string;
  score: number;
  approved: boolean;
  evaluatedBy: string;
  evaluatedAt: string;
}

export interface AuditSubProcess {
  id: string;
  auditId: string;
  name: string;
  responsibility: string;
  inputs: string;
  activities: string;
  outputs: string;
  kpis: AuditKpi[];
  clauseChecks: ClauseCheck[];
  evidence: DocumentRef[];
  evaluation: EffectivenessEvaluation | null;
  createdAt: string;
}

/* ---------------------------- Admin / settings --------------------------- */

export type ReminderModule = "Training" | "PPM" | "Supplier" | "Project" | "Audit";
export type ReminderChannel = "Email" | "In-App" | "Email + In-App";

export interface ReminderRule {
  id: string;
  module: ReminderModule;
  event: string;
  leadDays: number;
  channel: ReminderChannel;
  recipients: string;
  enabled: boolean;
}

export interface Session {
  role: UserRole;
  employeeId: string;
}

export interface QmsState {
  employees: Employee[];
  courses: TrainingCourse[];
  assignments: TrainingAssignment[];
  assets: Asset[];
  maintenanceRequests: MaintenanceRequest[];
  suppliers: Supplier[];
  projects: Project[];
  phases: ProjectPhase[];
  milestones: ProjectMilestone[];
  tasks: ProjectTask[];
  audits: Audit[];
  subProcesses: AuditSubProcess[];
  reminders: ReminderRule[];
  session: Session;
}

export type CollectionKey = {
  [K in keyof QmsState]: QmsState[K] extends Array<unknown> ? K : never;
}[keyof QmsState];

export type CollectionItem<K extends CollectionKey> = QmsState[K][number];

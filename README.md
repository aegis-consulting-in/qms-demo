# Northwind QMS

A standalone Quality Management System built with Next.js (App Router), React, Tailwind CSS and
Lucide icons. There is no backend: every record lives in React state and is persisted to
`localStorage`, and file uploads are mocked with browser object URLs.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npx eslint .     # lint
```

## Modules

| Route          | Module                 | What it covers                                                                                                |
| -------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/`            | Dashboard              | Cross-module compliance overview, overdue items, reminder preview                                              |
| `/training`    | Training Management    | Employee details, course registry (incl. Excel bulk import), assignment, My Training, manager approval queue    |
| `/maintenance` | Preventive Maintenance | Asset/machine registry, maintenance workflow, consolidated document repository                                  |
| `/suppliers`   | Supplier Management    | Vendor registry with service classification and re-qualification dates                                          |
| `/projects`    | Project Management     | Projects → phases → milestones → tasks                                                                          |
| `/audits`      | Audit Process          | Audit creation, sub-processes with inherited base details, KPI / evidence / effectiveness stages                |
| `/admin`       | Admin Settings         | Role simulation, reminder alert rules, local data reset                                                         |

## Roles

The header menu (and Admin Settings) switches between **Standard Employee**, **Manager** and
**System Admin**. The role drives what is editable: employees can only work their own training,
managers own master data and approvals, admins additionally get Admin Settings.

## Data & files

- State shape and fixtures: `lib/types.ts`, `lib/fixtures.ts`
- Store, persistence and session: `lib/store.tsx` (localStorage key `qms.local.state`)
- Upload handling: `lib/file-store.ts`

Uploaded files are registered as object URLs in memory, so previews work for the current session
while the document metadata is persisted. After a reload the record remains and the viewer explains
that the blob is gone. **Reset to demo data** in Admin Settings restores the original fixtures.

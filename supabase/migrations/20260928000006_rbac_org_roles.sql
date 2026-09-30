-- =============================================================================
-- Align roles with the QMS org chart (process owners, not module specialists)
-- Migration 6
-- =============================================================================

insert into public.roles (name, description, is_system) values
  (
    'Finance & Administration',
    'Owns HR, supplier approvals, maintenance/calibration and document control',
    false
  )
on conflict (name) do update
  set description = excluded.description,
      is_system = excluded.is_system;

-- Grant the combined Finance & Admin function (idempotent).
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'Finance & Administration'
  and p.key in (
    'training.view', 'training.create', 'training.edit', 'training.delete', 'training.assign', 'training.team',
    'employee.view', 'employee.create', 'employee.edit', 'employee.delete',
    'supplier.view', 'supplier.create', 'supplier.edit', 'supplier.delete',
    'maintenance.view', 'maintenance.create', 'maintenance.edit', 'maintenance.delete',
    'documents.view', 'documents.upload', 'documents.download', 'documents.delete'
  )
on conflict do nothing;

-- Move people off the old specialist roles onto Finance & Administration.
insert into public.user_roles (user_id, role_id)
select ur.user_id, fin.id
from public.user_roles ur
join public.roles old on old.id = ur.role_id
join public.roles fin on fin.name = 'Finance & Administration'
where old.name in ('Training Manager', 'Supplier Manager', 'Maintenance Manager')
on conflict do nothing;

delete from public.user_roles
where role_id in (select id from public.roles where name in ('Training Manager', 'Supplier Manager', 'Maintenance Manager'));
delete from public.role_permissions
where role_id in (select id from public.roles where name in ('Training Manager', 'Supplier Manager', 'Maintenance Manager'));
delete from public.roles
where name in ('Training Manager', 'Supplier Manager', 'Maintenance Manager');

-- Project Manager → Construction Management (project owners; can see suppliers for subcontractors).
do $$
begin
  if exists (select 1 from public.roles where name = 'Project Manager')
     and not exists (select 1 from public.roles where name = 'Construction Management') then
    update public.roles
    set name = 'Construction Management',
        description = 'Owns project management and subcontractor control'
    where name = 'Project Manager';
  end if;
end $$;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'supplier.view'
where r.name = 'Construction Management'
on conflict do nothing;

-- Auditor → Quality & Compliance.
do $$
begin
  if exists (select 1 from public.roles where name = 'Auditor')
     and not exists (select 1 from public.roles where name = 'Quality & Compliance') then
    update public.roles
    set name = 'Quality & Compliance',
        description = 'Owns internal audit, findings and CAPA'
    where name = 'Auditor';
  end if;
end $$;

-- Org-chart departments (keep existing ones; employees may already reference them).
insert into public.departments (name, code, description) values
  ('Finance & Business Administration', 'FBA', 'HR, purchasing, asset management and document control'),
  ('Commercial & Sales', 'COM', 'RFT/RFQ, project proposals and fee agreements'),
  ('Construction Management', 'CON', 'Project management and subcontractor control'),
  ('Quality & Compliance', 'QC', 'Internal audit and CAPA')
on conflict (name) do update set code = excluded.code, description = excluded.description;

insert into public.job_titles (name) values
  ('Managing Director'),
  ('Finance & Administration Manager'),
  ('Construction Manager')
on conflict (name) do nothing;

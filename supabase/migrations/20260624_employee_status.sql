-- Safe additive employee status for local/PMS eligibility rules.
-- Existing is_active is preserved; this adds richer frontend statuses without dropping old data.
alter table public.employees
  add column if not exists employee_status text not null default 'Aktif'
  check (employee_status in ('Aktif', 'Blacklist', 'Non Aktif'));

update public.employees
set employee_status = 'Non Aktif'
where is_active = false and employee_status = 'Aktif';

create index if not exists idx_employees_employee_status on public.employees(employee_status);

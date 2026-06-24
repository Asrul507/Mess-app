-- Safe additive site/location fields for employee placement and guest lifecycle context.
alter table public.employees
  add column if not exists site text;

alter table public.reservations
  add column if not exists site text;

-- Existing check-in/stay tables differ across deployments; add only when the table exists.
do $$
begin
  if to_regclass('public.checkins') is not null then
    alter table public.checkins add column if not exists site text;
  end if;
end $$;

create index if not exists idx_employees_site on public.employees(site);
create index if not exists idx_reservations_site on public.reservations(site);

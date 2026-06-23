-- Fix error: cannot alter type of a column used by a view or rule
-- Jalankan jika migration feature update gagal di bagian alter checkins.keperluan.

begin;

-- Drop view yang bergantung pada checkins.keperluan terlebih dahulu.
drop view if exists public.v_meal_report;
drop view if exists public.v_active_guests;
drop view if exists public.v_guest_report;

-- Buat tabel pilihan keperluan dinamis.
create table if not exists public.purpose_options (
  id uuid primary key default gen_random_uuid(),
  purpose_name text not null unique,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger updated_at untuk purpose_options.
drop trigger if exists set_purpose_options_updated_at on public.purpose_options;
create trigger set_purpose_options_updated_at
before update on public.purpose_options
for each row execute function public.set_updated_at();

-- Isi pilihan keperluan awal.
insert into public.purpose_options (purpose_name)
values
  ('Cuti'),
  ('On Site'),
  ('Dinas'),
  ('New Hire Onsite'),
  ('New Hire MCU'),
  ('MCU Tahunan'),
  ('Long Stay')
on conflict (purpose_name) do nothing;

-- Ubah checkins.keperluan dari enum menjadi text agar bisa menerima input baru.
alter table public.checkins
alter column keperluan type text using keperluan::text;

-- Tambah field checkout tambahan.
alter table public.checkins
add column if not exists checkout_note text;

alter table public.checkins
add column if not exists last_action text;

-- Tambah contoh kamar sharing 3 dan sharing 6.
insert into public.rooms (room_no, bed_code, capacity, room_type, status)
values
  ('201', 'A', 1, 'Sharing 3', 'available'),
  ('201', 'B', 1, 'Sharing 3', 'available'),
  ('201', 'C', 1, 'Sharing 3', 'available'),
  ('301', 'A', 1, 'Sharing 6', 'available'),
  ('301', 'B', 1, 'Sharing 6', 'available'),
  ('301', 'C', 1, 'Sharing 6', 'available'),
  ('301', 'D', 1, 'Sharing 6', 'available'),
  ('301', 'E', 1, 'Sharing 6', 'available'),
  ('301', 'F', 1, 'Sharing 6', 'available')
on conflict (room_no, bed_code) do nothing;

-- RLS untuk purpose_options.
alter table public.purpose_options enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
    and tablename = 'purpose_options'
    and policyname = 'authenticated_crud_purpose_options'
  ) then
    create policy authenticated_crud_purpose_options on public.purpose_options
    for all to authenticated
    using (true)
    with check (true);
  end if;
end $$;

-- Buat ulang view v_active_guests.
create or replace view public.v_active_guests as
select
  c.id as checkin_id,
  c.guest_name,
  c.guest_nik,
  e.jabatan,
  e.posisi,
  coalesce(o.office_name, c.office_name, e.office_name) as office_name,
  r.room_no,
  r.bed_code,
  r.display_name as room_display,
  r.room_type,
  c.keperluan,
  c.dapat_makan,
  c.checkin_date,
  c.checkout_plan,
  c.status,
  c.note
from public.checkins c
left join public.employees e on e.id = c.employee_id
left join public.offices o on o.id = c.office_id
join public.rooms r on r.id = c.room_id
where c.status = 'in_house';

-- Buat ulang view v_meal_report.
create or replace view public.v_meal_report as
select
  ma.id as meal_id,
  ma.meal_date,
  ma.meal_type,
  ma.meal_time,
  c.guest_name,
  c.guest_nik,
  coalesce(o.office_name, c.office_name, e.office_name) as office_name,
  e.jabatan,
  e.posisi,
  r.display_name as room_display,
  c.keperluan,
  ma.note,
  ma.created_at
from public.meal_attendance ma
join public.checkins c on c.id = ma.checkin_id
left join public.employees e on e.id = ma.employee_id
left join public.offices o on o.id = c.office_id
join public.rooms r on r.id = c.room_id;

-- Buat view laporan tamu: CI / In House / Check Out.
create or replace view public.v_guest_report as
select
  c.id as checkin_id,
  case
    when c.status = 'checked_out' then 'Check Out'
    when c.status = 'in_house' then 'In House'
    else 'CI'
  end as report_status,
  c.guest_name,
  c.guest_nik,
  e.jabatan,
  e.posisi,
  coalesce(o.office_name, c.office_name, e.office_name) as office_name,
  r.display_name as room_display,
  r.room_type,
  c.keperluan,
  c.dapat_makan,
  c.checkin_date,
  c.checkout_date,
  case
    when c.checkout_date is not null then (c.checkout_date - c.checkin_date + 1)
    else (current_date - c.checkin_date + 1)
  end as lama_menginap_hari,
  c.note,
  c.checkout_note,
  c.created_at,
  c.updated_at
from public.checkins c
left join public.employees e on e.id = c.employee_id
left join public.offices o on o.id = c.office_id
join public.rooms r on r.id = c.room_id;

commit;

-- Test setelah berhasil:
-- select * from public.purpose_options order by purpose_name;
-- select * from public.v_active_guests;
-- select * from public.v_guest_report order by checkin_date desc;

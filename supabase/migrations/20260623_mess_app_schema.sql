-- Mess App Supabase Schema
-- Jalankan file ini di Supabase SQL Editor.
-- Urutan aman untuk project baru.

create extension if not exists "pgcrypto";

-- =====================================================
-- ENUM TYPES
-- =====================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'employee_level') then
    create type employee_level as enum ('Staff', 'Non Staff', 'Manager');
  end if;

  if not exists (select 1 from pg_type where typname = 'room_status') then
    create type room_status as enum ('available', 'occupied', 'maintenance', 'inactive');
  end if;

  if not exists (select 1 from pg_type where typname = 'checkin_status') then
    create type checkin_status as enum ('in_house', 'checked_out', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'meal_type') then
    create type meal_type as enum ('Pagi', 'Siang', 'Malam');
  end if;

  if not exists (select 1 from pg_type where typname = 'purpose_type') then
    create type purpose_type as enum ('Dinas', 'Training', 'Rolling/Mutasi', 'Tamu Perusahaan', 'Lainnya');
  end if;
end $$;

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================
-- OFFICES
-- =====================================================

create table if not exists public.offices (
  id uuid primary key default gen_random_uuid(),
  office_name text not null unique,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_offices_updated_at
before update on public.offices
for each row execute function public.set_updated_at();

-- =====================================================
-- EMPLOYEES / DATABASE KARYAWAN
-- =====================================================

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_name text not null,
  nik text not null unique,
  jabatan employee_level not null default 'Staff',
  posisi text not null,
  office_id uuid references public.offices(id) on delete set null,
  office_name text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_employees_name on public.employees using btree (employee_name);
create index if not exists idx_employees_nik on public.employees using btree (nik);
create index if not exists idx_employees_office on public.employees using btree (office_id);

create trigger set_employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

-- =====================================================
-- ROOMS / DATA KAMAR DAN BED
-- Contoh:
-- Single room: room_no = 102, bed_code = null
-- Sharing room: room_no = 101, bed_code = A/B/C/D
-- Tampilan aplikasi bisa menjadi 101A, 101B, 101C, 101D
-- =====================================================

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_no text not null,
  bed_code text,
  display_name text generated always as (
    case
      when bed_code is null or trim(bed_code) = '' then room_no
      else room_no || upper(trim(bed_code))
    end
  ) stored,
  capacity int not null default 1 check (capacity > 0),
  room_type text not null default 'Single',
  status room_status not null default 'available',
  floor text,
  building text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_room_bed unique (room_no, bed_code)
);

create index if not exists idx_rooms_room_no on public.rooms using btree (room_no);
create index if not exists idx_rooms_status on public.rooms using btree (status);
create index if not exists idx_rooms_display_name on public.rooms using btree (display_name);

create trigger set_rooms_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

-- =====================================================
-- CHECKINS / IN HOUSE MESS
-- Mirip check-in hotel, tetapi ada keperluan, dapat makan, dan office.
-- =====================================================

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete restrict,
  room_id uuid not null references public.rooms(id) on delete restrict,
  guest_name text not null,
  guest_nik text,
  keperluan purpose_type not null default 'Dinas',
  dapat_makan boolean not null default false,
  office_id uuid references public.offices(id) on delete set null,
  office_name text,
  checkin_date date not null default current_date,
  checkout_plan date,
  checkout_date date,
  status checkin_status not null default 'in_house',
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_checkout_plan check (checkout_plan is null or checkout_plan >= checkin_date),
  constraint valid_checkout_date check (checkout_date is null or checkout_date >= checkin_date)
);

create index if not exists idx_checkins_employee on public.checkins using btree (employee_id);
create index if not exists idx_checkins_room on public.checkins using btree (room_id);
create index if not exists idx_checkins_status on public.checkins using btree (status);
create index if not exists idx_checkins_date on public.checkins using btree (checkin_date);
create index if not exists idx_checkins_office on public.checkins using btree (office_id);

-- Satu bed/kamar hanya boleh punya 1 penghuni aktif.
create unique index if not exists unique_active_room_checkin
on public.checkins(room_id)
where status = 'in_house';

create trigger set_checkins_updated_at
before update on public.checkins
for each row execute function public.set_updated_at();

-- =====================================================
-- MEAL ATTENDANCE / ABSEN MAKAN
-- =====================================================

create table if not exists public.meal_attendance (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  meal_date date not null default current_date,
  meal_type meal_type not null,
  meal_time time not null default current_time,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_meal_per_guest unique (checkin_id, meal_date, meal_type)
);

create index if not exists idx_meal_attendance_date on public.meal_attendance using btree (meal_date);
create index if not exists idx_meal_attendance_type on public.meal_attendance using btree (meal_type);
create index if not exists idx_meal_attendance_employee on public.meal_attendance using btree (employee_id);
create index if not exists idx_meal_attendance_checkin on public.meal_attendance using btree (checkin_id);

create trigger set_meal_attendance_updated_at
before update on public.meal_attendance
for each row execute function public.set_updated_at();

-- =====================================================
-- ROOM STATUS AUTO UPDATE FUNCTION
-- =====================================================

create or replace function public.sync_room_status_after_checkin()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'in_house' then
      update public.rooms set status = 'occupied' where id = new.room_id;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.room_id is distinct from new.room_id then
      update public.rooms
      set status = case
        when exists (
          select 1 from public.checkins c
          where c.room_id = old.room_id
          and c.status = 'in_house'
          and c.id <> new.id
        ) then 'occupied'::room_status
        else 'available'::room_status
      end
      where id = old.room_id and status <> 'maintenance';
    end if;

    if new.status = 'in_house' then
      update public.rooms set status = 'occupied' where id = new.room_id and status <> 'maintenance';
    elsif old.status = 'in_house' and new.status in ('checked_out', 'cancelled') then
      update public.rooms
      set status = 'available'
      where id = old.room_id
      and status <> 'maintenance'
      and not exists (
        select 1 from public.checkins c
        where c.room_id = old.room_id
        and c.status = 'in_house'
        and c.id <> new.id
      );
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.rooms
    set status = 'available'
    where id = old.room_id
    and status <> 'maintenance'
    and not exists (
      select 1 from public.checkins c
      where c.room_id = old.room_id
      and c.status = 'in_house'
      and c.id <> old.id
    );
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists sync_room_status_checkins on public.checkins;
create trigger sync_room_status_checkins
after insert or update or delete on public.checkins
for each row execute function public.sync_room_status_after_checkin();

-- =====================================================
-- VIEWS UNTUK REKAP
-- =====================================================

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

-- =====================================================
-- ROW LEVEL SECURITY
-- Policy awal: semua user login bisa CRUD.
-- Nanti bisa diperketat berdasarkan role admin/supervisor/staff.
-- =====================================================

alter table public.offices enable row level security;
alter table public.employees enable row level security;
alter table public.rooms enable row level security;
alter table public.checkins enable row level security;
alter table public.meal_attendance enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'offices' and policyname = 'authenticated_crud_offices'
  ) then
    create policy authenticated_crud_offices on public.offices
    for all to authenticated
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'employees' and policyname = 'authenticated_crud_employees'
  ) then
    create policy authenticated_crud_employees on public.employees
    for all to authenticated
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'rooms' and policyname = 'authenticated_crud_rooms'
  ) then
    create policy authenticated_crud_rooms on public.rooms
    for all to authenticated
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'checkins' and policyname = 'authenticated_crud_checkins'
  ) then
    create policy authenticated_crud_checkins on public.checkins
    for all to authenticated
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'meal_attendance' and policyname = 'authenticated_crud_meal_attendance'
  ) then
    create policy authenticated_crud_meal_attendance on public.meal_attendance
    for all to authenticated
    using (true)
    with check (true);
  end if;
end $$;

-- =====================================================
-- SAMPLE DATA KAMAR
-- Boleh dihapus jika nanti data kamar di-upload via Excel/CSV.
-- =====================================================

insert into public.rooms (room_no, bed_code, capacity, room_type)
values
  ('101', 'A', 1, 'Sharing 4'),
  ('101', 'B', 1, 'Sharing 4'),
  ('101', 'C', 1, 'Sharing 4'),
  ('101', 'D', 1, 'Sharing 4'),
  ('102', null, 1, 'Single'),
  ('103', 'A', 1, 'Sharing 2'),
  ('103', 'B', 1, 'Sharing 2')
on conflict (room_no, bed_code) do nothing;

-- =====================================================
-- QUERY TEST
-- =====================================================

-- select * from public.rooms order by room_no, bed_code;
-- select * from public.v_active_guests;
-- select * from public.v_meal_report order by meal_date desc, meal_time desc;

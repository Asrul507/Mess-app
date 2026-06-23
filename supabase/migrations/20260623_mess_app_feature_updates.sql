-- Mess App Feature Updates
-- Jalankan setelah migration awal: 20260623_mess_app_schema.sql
-- Catatan penting:
-- Untuk keperluan yang bisa ditambah dari aplikasi, jangan pakai PostgreSQL enum kaku.
-- Gunakan table purpose_options agar pilihan baru bisa disimpan otomatis dari frontend.

-- =====================================================
-- PURPOSE OPTIONS / PILIHAN KEPERLUAN DINAMIS
-- =====================================================

create table if not exists public.purpose_options (
  id uuid primary key default gen_random_uuid(),
  purpose_name text not null unique,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_purpose_options_updated_at
before update on public.purpose_options
for each row execute function public.set_updated_at();

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

-- Jika migration awal masih memakai enum purpose_type di checkins.keperluan,
-- kolom ini akan diubah menjadi text agar bisa menerima pilihan baru dari aplikasi.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
    and table_name = 'checkins'
    and column_name = 'keperluan'
  ) then
    alter table public.checkins
    alter column keperluan type text using keperluan::text;
  end if;
end $$;

-- =====================================================
-- ROOM STATUS MODEL
-- =====================================================

-- Pastikan status kamar support model berikut:
-- available: kosong dan bisa dipakai
-- occupied: sedang terisi
-- maintenance: rusak/perbaikan/cleaning hold
-- inactive: tidak dipakai sementara

do $$
begin
  -- Enum room_status sudah dibuat di migration awal.
  -- Bagian ini aman jika enum value sudah ada.
  begin
    alter type room_status add value if not exists 'available';
  exception when duplicate_object then null;
  end;

  begin
    alter type room_status add value if not exists 'occupied';
  exception when duplicate_object then null;
  end;

  begin
    alter type room_status add value if not exists 'maintenance';
  exception when duplicate_object then null;
  end;

  begin
    alter type room_status add value if not exists 'inactive';
  exception when duplicate_object then null;
  end;
end $$;

-- =====================================================
-- ROOM TYPES SHARING 3 DAN SHARING 6
-- =====================================================

-- room_type pada migration awal berupa text, jadi tidak perlu alter enum.
-- Berikut contoh insert kamar sharing 3 dan sharing 6. Boleh dihapus jika upload via Excel.

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

-- =====================================================
-- CHECKOUT MODEL
-- =====================================================

-- Rencana checkout tidak perlu ditampilkan di frontend.
-- Checkout aktual otomatis diisi saat action Check Out.
-- Kolom checkout_date dari migration awal tetap dipakai.

alter table public.checkins
add column if not exists checkout_note text;

alter table public.checkins
add column if not exists last_action text;

-- =====================================================
-- GUEST REPORT VIEW
-- CI / IN HOUSE / CHECK OUT
-- =====================================================

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

-- =====================================================
-- MEAL QUICK ATTENDANCE SUPPORT
-- =====================================================

-- Table meal_attendance awal sudah cukup untuk tombol cepat Pagi/Siang/Malam.
-- Constraint unique_meal_per_guest memastikan 1 orang tidak double absen
-- pada tanggal dan jenis makan yang sama.

-- =====================================================
-- RLS PURPOSE OPTIONS
-- =====================================================

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

-- =====================================================
-- QUERY TEST
-- =====================================================

-- select * from public.purpose_options order by purpose_name;
-- select * from public.v_guest_report order by checkin_date desc;
-- select * from public.v_meal_report order by meal_date desc, meal_time desc;

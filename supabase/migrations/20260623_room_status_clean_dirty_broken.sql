-- Room status model: bersih, terisi, kotor, rusak
-- Paste file ini di Supabase SQL Editor setelah migration awal.
-- Tujuan:
-- 1. Status kamar memakai model housekeeping: bersih, terisi, kotor, rusak.
-- 2. Check in hanya boleh ke kamar bersih.
-- 3. Tidak boleh double input untuk kamar yang masih ada penghuni in house.
-- 4. Saat check out, kamar otomatis menjadi kotor.

begin;

-- Drop view yang mungkin bergantung pada rooms/status/checkins agar aman.
drop view if exists public.v_meal_report;
drop view if exists public.v_active_guests;
drop view if exists public.v_guest_report;

-- Drop trigger lama yang mengubah room status available/occupied.
drop trigger if exists sync_room_status_checkins on public.checkins;
drop function if exists public.sync_room_status_after_checkin();

-- Hapus default lama sebelum ubah tipe kolom status.
alter table public.rooms alter column status drop default;

-- Ubah rooms.status menjadi text agar status fleksibel sesuai kebutuhan operasional.
alter table public.rooms
alter column status type text using
  case status::text
    when 'available' then 'bersih'
    when 'occupied' then 'terisi'
    when 'maintenance' then 'rusak'
    when 'inactive' then 'rusak'
    else coalesce(status::text, 'bersih')
  end;

-- Set default baru dan validasi status.
alter table public.rooms alter column status set default 'bersih';

alter table public.rooms
add constraint rooms_status_check
check (status in ('bersih', 'terisi', 'kotor', 'rusak'))
not valid;

alter table public.rooms validate constraint rooms_status_check;

-- Normalisasi data lama.
update public.rooms
set status = case
  when status in ('bersih', 'terisi', 'kotor', 'rusak') then status
  when status = 'available' then 'bersih'
  when status = 'occupied' then 'terisi'
  when status in ('maintenance', 'inactive') then 'rusak'
  else 'bersih'
end;

-- Pastikan kamar yang masih in_house menjadi terisi.
update public.rooms r
set status = 'terisi'
where exists (
  select 1 from public.checkins c
  where c.room_id = r.id
  and c.status = 'in_house'
);

-- Pastikan kamar tanpa penghuni aktif tapi status terisi menjadi kotor.
update public.rooms r
set status = 'kotor'
where r.status = 'terisi'
and not exists (
  select 1 from public.checkins c
  where c.room_id = r.id
  and c.status = 'in_house'
);

-- Tetap jaga 1 kamar/bed hanya bisa 1 penghuni aktif.
create unique index if not exists unique_active_room_checkin
on public.checkins(room_id)
where status = 'in_house';

-- Validasi sebelum check in/update: kamar harus bersih jika membuat penghuni in_house.
create or replace function public.validate_room_before_checkin()
returns trigger
language plpgsql
as $$
declare
  current_room_status text;
begin
  if new.status = 'in_house' then
    select status into current_room_status
    from public.rooms
    where id = new.room_id
    for update;

    if current_room_status is null then
      raise exception 'Kamar tidak ditemukan.';
    end if;

    -- Kalau update pada record yang sama dan room_id tidak berubah, tetap boleh edit data penghuni.
    if tg_op = 'UPDATE' and old.id = new.id and old.room_id = new.room_id and old.status = 'in_house' then
      return new;
    end if;

    if current_room_status <> 'bersih' then
      raise exception 'Kamar hanya bisa check in jika status kamar bersih. Status sekarang: %', current_room_status;
    end if;

    if exists (
      select 1 from public.checkins c
      where c.room_id = new.room_id
      and c.status = 'in_house'
      and (tg_op = 'INSERT' or c.id <> new.id)
    ) then
      raise exception 'Kamar ini masih ditempati penghuni lain.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_room_before_checkin_trigger on public.checkins;
create trigger validate_room_before_checkin_trigger
before insert or update on public.checkins
for each row execute function public.validate_room_before_checkin();

-- Sinkron status kamar setelah insert/update/delete checkins.
create or replace function public.sync_room_status_clean_dirty()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'in_house' then
      update public.rooms set status = 'terisi' where id = new.room_id;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- Jika pindah kamar, kamar lama menjadi kotor jika tidak ada penghuni aktif lain.
    if old.room_id is distinct from new.room_id then
      update public.rooms
      set status = 'kotor'
      where id = old.room_id
      and not exists (
        select 1 from public.checkins c
        where c.room_id = old.room_id
        and c.status = 'in_house'
        and c.id <> new.id
      );
    end if;

    -- Kamar baru menjadi terisi jika status checkin in_house.
    if new.status = 'in_house' then
      update public.rooms set status = 'terisi' where id = new.room_id;
    end if;

    -- Saat checkout/cancel dari in_house, kamar menjadi kotor.
    if old.status = 'in_house' and new.status in ('checked_out', 'cancelled') then
      update public.rooms
      set status = 'kotor'
      where id = old.room_id
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
    set status = 'kotor'
    where id = old.room_id
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

drop trigger if exists sync_room_status_clean_dirty_trigger on public.checkins;
create trigger sync_room_status_clean_dirty_trigger
after insert or update or delete on public.checkins
for each row execute function public.sync_room_status_clean_dirty();

-- View active guests.
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
  r.status as room_status,
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

-- View meal report.
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
  r.status as room_status,
  c.keperluan,
  ma.note,
  ma.created_at
from public.meal_attendance ma
join public.checkins c on c.id = ma.checkin_id
left join public.employees e on e.id = ma.employee_id
left join public.offices o on o.id = c.office_id
join public.rooms r on r.id = c.room_id;

-- View guest report.
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
  r.status as room_status,
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

-- TEST:
-- select status, count(*) from public.rooms group by status order by status;
-- select * from public.v_active_guests;
-- select * from public.v_guest_report order by checkin_date desc;

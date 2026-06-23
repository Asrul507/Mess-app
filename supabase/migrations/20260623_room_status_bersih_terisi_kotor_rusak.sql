-- Mess App: Room status model bersih/terisi/kotor/rusak
-- Jalankan setelah migration awal dan hotfix view dependency.

begin;

-- View yang bergantung pada rooms/status akan dibuat ulang agar aman.
drop view if exists public.v_active_guests;
drop view if exists public.v_guest_report;
drop view if exists public.v_room_status_overview;

-- Tambah enum value baru untuk status kamar.
alter type room_status add value if not exists 'bersih';
alter type room_status add value if not exists 'terisi';
alter type room_status add value if not exists 'kotor';
alter type room_status add value if not exists 'rusak';

commit;

-- Perubahan data enum harus di luar transaction pada beberapa versi PostgreSQL.
-- Mapping status lama ke status baru.
update public.rooms
set status = case
  when status::text = 'available' then 'bersih'::room_status
  when status::text = 'occupied' then 'terisi'::room_status
  when status::text = 'maintenance' then 'rusak'::room_status
  when status::text = 'inactive' then 'rusak'::room_status
  else status
end;

-- Default kamar baru menjadi bersih.
alter table public.rooms
alter column status set default 'bersih'::room_status;

-- Function auto status kamar:
-- check in -> terisi
-- check out/cancel/delete -> kotor
-- kamar rusak tetap rusak sampai diubah manual.
create or replace function public.sync_room_status_after_checkin()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'in_house' then
      update public.rooms
      set status = 'terisi'
      where id = new.room_id
      and status <> 'rusak';
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
        ) then 'terisi'::room_status
        else 'kotor'::room_status
      end
      where id = old.room_id
      and status <> 'rusak';
    end if;

    if new.status = 'in_house' then
      update public.rooms
      set status = 'terisi'
      where id = new.room_id
      and status <> 'rusak';
    elsif old.status = 'in_house' and new.status in ('checked_out', 'cancelled') then
      update public.rooms
      set status = 'kotor'
      where id = old.room_id
      and status <> 'rusak'
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
    and status <> 'rusak'
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

-- Pastikan trigger pakai function terbaru.
drop trigger if exists sync_room_status_checkins on public.checkins;
create trigger sync_room_status_checkins
after insert or update or delete on public.checkins
for each row execute function public.sync_room_status_after_checkin();

-- View status kamar untuk menu Room/Kamar.
create or replace view public.v_room_status_overview as
select
  r.id as room_id,
  r.room_no,
  r.bed_code,
  r.display_name as room_display,
  r.room_type,
  r.status::text as room_status,
  r.floor,
  r.building,
  r.note,
  c.id as checkin_id,
  c.guest_name,
  c.guest_nik,
  c.checkin_date,
  c.keperluan,
  c.dapat_makan
from public.rooms r
left join public.checkins c
  on c.room_id = r.id
  and c.status = 'in_house';

-- View active guest dibuat ulang.
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
  r.status::text as room_status,
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

-- View laporan tamu dibuat ulang.
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
  r.status::text as room_status,
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

-- Contoh kamar baru sharing 3 dan 6 dengan status bersih.
insert into public.rooms (room_no, bed_code, capacity, room_type, status)
values
  ('201', 'A', 1, 'Sharing 3', 'bersih'),
  ('201', 'B', 1, 'Sharing 3', 'bersih'),
  ('201', 'C', 1, 'Sharing 3', 'bersih'),
  ('301', 'A', 1, 'Sharing 6', 'bersih'),
  ('301', 'B', 1, 'Sharing 6', 'bersih'),
  ('301', 'C', 1, 'Sharing 6', 'bersih'),
  ('301', 'D', 1, 'Sharing 6', 'bersih'),
  ('301', 'E', 1, 'Sharing 6', 'bersih'),
  ('301', 'F', 1, 'Sharing 6', 'bersih')
on conflict (room_no, bed_code) do nothing;

-- Query test:
-- select * from public.v_room_status_overview order by room_no, bed_code;
-- select room_status, count(*) from public.v_room_status_overview group by room_status;

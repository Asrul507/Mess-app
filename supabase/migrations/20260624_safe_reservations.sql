-- Safe additive table for hotel-style booking flow. Does not modify existing tables.
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid null,
  name text not null,
  nik text null,
  level text null,
  position text null,
  office text null,
  room_id uuid null,
  purpose text null,
  meal_eligible text not null default 'Ya',
  reservation_date date not null default current_date,
  checkin_date date null,
  note text null,
  status text not null default 'Reserved' check (status in ('Reserved', 'Checked In', 'Cancelled', 'No Show')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reservations_status_idx on public.reservations(status);
create index if not exists reservations_date_idx on public.reservations(reservation_date);

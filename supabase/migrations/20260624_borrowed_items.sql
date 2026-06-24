-- Safe additive borrowed item tracking for check-in / stay records.
do $$
begin
  if to_regclass('public.checkins') is not null then
    alter table public.checkins add column if not exists borrowed_item text;
    alter table public.checkins add column if not exists borrowed_qty integer;
    alter table public.checkins add column if not exists borrowed_returned boolean not null default true;
    alter table public.checkins add column if not exists borrowed_returned_at timestamptz;
  end if;
end $$;

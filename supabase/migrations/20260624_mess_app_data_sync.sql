-- Mess App shared data storage
-- Jalankan di Supabase SQL Editor sebelum deploy/merge fitur sync.

create table if not exists public.mess_app_data (
  app_key text primary key,
  payload jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.mess_app_data enable row level security;

-- Public frontend app memakai anon key, jadi policy ini membuka akses CRUD untuk tabel ini.
-- Untuk produksi multi-user, ganti dengan auth/RLS per user atau per client.
drop policy if exists "mess_app_data_select_anon" on public.mess_app_data;
create policy "mess_app_data_select_anon"
  on public.mess_app_data
  for select
  to anon, authenticated
  using (true);

drop policy if exists "mess_app_data_insert_anon" on public.mess_app_data;
create policy "mess_app_data_insert_anon"
  on public.mess_app_data
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "mess_app_data_update_anon" on public.mess_app_data;
create policy "mess_app_data_update_anon"
  on public.mess_app_data
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "mess_app_data_delete_anon" on public.mess_app_data;
create policy "mess_app_data_delete_anon"
  on public.mess_app_data
  for delete
  to anon, authenticated
  using (true);

create or replace function public.set_mess_app_data_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_mess_app_data_updated_at on public.mess_app_data;
create trigger set_mess_app_data_updated_at
  before update on public.mess_app_data
  for each row
  execute function public.set_mess_app_data_updated_at();

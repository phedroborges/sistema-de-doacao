create table public.raffle_entries (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  source_key text not null,
  name text not null,
  phone text not null default '',
  registered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint raffle_entries_event_source_key unique (event_id, source_key),
  constraint raffle_entries_name_check check (char_length(name) between 2 and 120),
  constraint raffle_entries_phone_check check (phone = '' or phone ~ '^[1-9][0-9]{9,10}$')
);

create index raffle_entries_event_name_idx
  on public.raffle_entries (event_id, name);

create index raffle_entries_event_registered_idx
  on public.raffle_entries (event_id, registered_at);

create trigger raffle_entries_set_updated_at
before update on public.raffle_entries
for each row execute function private.set_updated_at();

alter table public.raffle_entries enable row level security;

create policy "admins can read raffle entries"
on public.raffle_entries for select
to authenticated
using ((select private.is_admin()));

create policy "admins can update raffle entries"
on public.raffle_entries for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

revoke all on public.raffle_entries from anon;
grant select, update on public.raffle_entries to authenticated;

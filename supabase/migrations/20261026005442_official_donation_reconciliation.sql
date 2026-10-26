create table public.event_financial_reconciliations (
  event_id text primary key references public.events(id) on delete cascade,
  verified_transfers numeric(12, 2) not null check (verified_transfers >= 0),
  athletics_total numeric(12, 2) not null check (
    athletics_total >= 0 and athletics_total <= verified_transfers
  ),
  store_clients numeric(12, 2) not null check (store_clients >= 0),
  vizantu numeric(12, 2) not null check (vizantu >= 0),
  emporio_vint3 numeric(12, 2) not null check (emporio_vint3 >= 0),
  unattributed_transfers numeric(12, 2) generated always as (
    verified_transfers - athletics_total
  ) stored,
  official_total numeric(12, 2) generated always as (
    verified_transfers + store_clients + vizantu + emporio_vint3
  ) stored,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table public.participant_reconciliations (
  participant_id text primary key references public.participants(id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  weight_kg numeric(12, 2) not null check (weight_kg >= 0),
  donation_count integer not null check (donation_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.event_financial_reconciliations enable row level security;
alter table public.participant_reconciliations enable row level security;

create policy "admins can manage financial reconciliations"
on public.event_financial_reconciliations
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "admins can manage participant reconciliations"
on public.participant_reconciliations
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

grant select, insert, update, delete on public.event_financial_reconciliations to authenticated;
grant select, insert, update, delete on public.participant_reconciliations to authenticated;

insert into public.event_financial_reconciliations (
  event_id,
  verified_transfers,
  athletics_total,
  store_clients,
  vizantu,
  emporio_vint3,
  notes
)
select
  id,
  1379.00,
  925.00,
  1036.00,
  175.00,
  125.00,
  'Conciliação do extrato bancário e dos valores informados pela Casa Caramelo em 25/10/2026.'
from public.events
where slug = '16-laf'
on conflict (event_id) do update set
  verified_transfers = excluded.verified_transfers,
  athletics_total = excluded.athletics_total,
  store_clients = excluded.store_clients,
  vizantu = excluded.vizantu,
  emporio_vint3 = excluded.emporio_vint3,
  notes = excluded.notes,
  updated_at = now();

insert into public.participant_reconciliations (
  participant_id,
  amount,
  weight_kg,
  donation_count
)
select
  p.id,
  r.amount,
  r.weight_kg,
  r.donation_count
from public.participants p
join public.events e on e.id = p.event_id
join (values
  ('Hematose', 320.00::numeric, 64.00::numeric, 33),
  ('Agrotóxicos', 310.00::numeric, 62.00::numeric, 50),
  ('Supinada', 105.00::numeric, 21.00::numeric, 18),
  ('Mercenária', 80.00::numeric, 16.00::numeric, 15),
  ('Sistemática', 50.00::numeric, 10.00::numeric, 7),
  ('Milionária', 30.00::numeric, 6.00::numeric, 3),
  ('Fulminante', 25.00::numeric, 5.00::numeric, 3),
  ('Metaneira', 5.00::numeric, 1.00::numeric, 1)
) as r(name, amount, weight_kg, donation_count) on r.name = p.name
where e.slug = '16-laf'
on conflict (participant_id) do update set
  amount = excluded.amount,
  weight_kg = excluded.weight_kg,
  donation_count = excluded.donation_count,
  updated_at = now();

-- Os dois registros simulados continuam no histórico, mas deixam de ser
-- contabilizados como pagamentos confirmados.
update public.donations d
set confirmed_at = null
from public.participants p, public.events e
where d.participant_id = p.id
  and d.event_id = e.id
  and e.slug = '16-laf'
  and d.amount = 500.00
  and (
    (d.donor_name = 'Felipe' and p.name = 'Mercenária')
    or (d.donor_name = 'Ana Clara cruvinel' and p.name = 'Agrotóxicos')
  );

create or replace function public.get_event_ranking(p_event_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with visible_event as (
    select id
    from public.events
    where id = p_event_id and status <> 'rascunho'
  ), official_available as (
    select exists (
      select 1
      from public.participant_reconciliations pr
      join public.participants p on p.id = pr.participant_id
      join visible_event ve on ve.id = p.event_id
    ) as value
  ), raw_participant_rows as (
    select
      p.id,
      p.name,
      p.group_name,
      p.image_url,
      p.goal_kg,
      p.sort_order,
      coalesce(sum(d.weight_kg) filter (where d.confirmed_at is not null), 0) as weight_kg,
      coalesce(sum(d.amount) filter (where d.confirmed_at is not null), 0) as amount,
      count(d.id) filter (where d.confirmed_at is not null) as donations
    from public.participants p
    join visible_event ve on ve.id = p.event_id
    left join public.donations d
      on d.event_id = p.event_id and d.participant_id = p.id
    where p.active
    group by p.id, p.name, p.group_name, p.image_url, p.goal_kg, p.sort_order
  ), official_participant_rows as (
    select
      p.id,
      p.name,
      p.group_name,
      p.image_url,
      p.goal_kg,
      p.sort_order,
      pr.weight_kg,
      pr.amount,
      pr.donation_count::bigint as donations
    from public.participants p
    join visible_event ve on ve.id = p.event_id
    join public.participant_reconciliations pr on pr.participant_id = p.id
    where p.active
  ), participant_rows as (
    select * from official_participant_rows
    where (select value from official_available)
    union all
    select * from raw_participant_rows
    where not (select value from official_available)
  ), raw_totals as (
    select
      count(d.id) filter (where d.confirmed_at is not null) as donations,
      coalesce(sum(d.weight_kg) filter (where d.confirmed_at is not null), 0) as weight_kg,
      coalesce(sum(d.amount) filter (where d.confirmed_at is not null), 0) as amount
    from visible_event ve
    left join public.donations d on d.event_id = ve.id
  ), totals as (
    select
      rt.donations,
      case
        when (select value from official_available)
          then coalesce((select sum(weight_kg) from official_participant_rows), 0)
        else rt.weight_kg
      end as weight_kg,
      coalesce(efr.verified_transfers, rt.amount) as amount
    from raw_totals rt
    left join public.event_financial_reconciliations efr on efr.event_id = p_event_id
  )
  select case when exists (select 1 from visible_event) then jsonb_build_object(
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'group_name', group_name,
        'image_url', image_url,
        'goal_kg', goal_kg,
        'weight_kg', weight_kg,
        'amount', amount,
        'donations', donations
      ) order by weight_kg desc, donations desc, sort_order, name)
      from participant_rows
    ), '[]'::jsonb),
    'donations', totals.donations,
    'weight_kg', totals.weight_kg,
    'amount', totals.amount
  ) else null end
  from totals;
$$;

revoke all on function public.get_event_ranking(text) from public;
grant execute on function public.get_event_ranking(text) to anon, authenticated;

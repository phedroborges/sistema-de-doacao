create policy "public can read visible financial reconciliations"
on public.event_financial_reconciliations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.status <> 'rascunho'
  )
);

grant select on public.event_financial_reconciliations to anon;

create or replace function public.ensure_month_charges(
  p_organization_id uuid,
  p_competence date
)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_competence date;
  v_inserted integer := 0;
begin
  if p_organization_id is null or p_competence is null then
    raise exception 'missing arguments';
  end if;
  if not private.is_org_member(p_organization_id) then
    raise exception 'not allowed';
  end if;

  v_competence := date_trunc('month', p_competence)::date;

  with inserted as (
    insert into public.charges (
      organization_id,
      enrollment_id,
      competence,
      due_date,
      amount,
      status
    )
    select
      e.organization_id,
      e.id,
      v_competence,
      least(
        v_competence + (e.due_day - 1),
        (v_competence + interval '1 month - 1 day')::date
      ),
      e.amount,
      'pending'::public.charge_status
    from public.enrollments e
    where e.organization_id = p_organization_id
      and e.active = true
      and e.billing_type = 'monthly'
      and e.due_day between 1 and 31
      and date_trunc('month', e.start_date)::date <= v_competence
      and (e.end_date is null or date_trunc('month', e.end_date)::date >= v_competence)
    on conflict (enrollment_id, competence) do nothing
    returning id
  )
  select count(*)::integer into v_inserted from inserted;

  return v_inserted;
end;
$$;

comment on function public.ensure_month_charges(uuid, date) is
  'Gera as cobranças mensais da competência para a organização. Idempotente.';

revoke all on function public.ensure_month_charges(uuid, date) from public, anon;
grant execute on function public.ensure_month_charges(uuid, date) to authenticated, service_role;

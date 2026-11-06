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
  v_monthly integer := 0;
  v_lessons integer := 0;
  v_one_off integer := 0;
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
    on conflict (enrollment_id, competence) where lesson_id is null do nothing
    returning id
  )
  select count(*)::integer into v_monthly from inserted;

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
      case
        when e.due_day between 1 and 31 then
          least(
            v_competence + (e.due_day - 1),
            (v_competence + interval '1 month - 1 day')::date
          )
        else coalesce(
          (
            select min((timezone('America/Sao_Paulo', l.scheduled_at))::date)
            from public.lessons l
            where l.enrollment_id = e.id
              and l.status <> 'rescheduled'
              and date_trunc('month', timezone('America/Sao_Paulo', l.scheduled_at))::date = v_competence
          ),
          v_competence
        )
      end,
      e.amount * (
        select count(*)::numeric
        from public.lessons l
        where l.enrollment_id = e.id
          and l.status <> 'rescheduled'
          and date_trunc('month', timezone('America/Sao_Paulo', l.scheduled_at))::date = v_competence
      ),
      'pending'::public.charge_status
    from public.enrollments e
    where e.organization_id = p_organization_id
      and e.active = true
      and e.billing_type = 'per_lesson'
      and date_trunc('month', e.start_date)::date <= v_competence
      and (e.end_date is null or date_trunc('month', e.end_date)::date >= v_competence)
      and exists (
        select 1
        from public.lessons l
        where l.enrollment_id = e.id
          and l.status <> 'rescheduled'
          and date_trunc('month', timezone('America/Sao_Paulo', l.scheduled_at))::date = v_competence
      )
    on conflict (enrollment_id, competence) where lesson_id is null do nothing
    returning id
  )
  select count(*)::integer into v_lessons from inserted;

  with inserted as (
    insert into public.charges (
      organization_id,
      enrollment_id,
      competence,
      due_date,
      amount,
      status,
      lesson_id
    )
    select
      e.organization_id,
      e.id,
      v_competence,
      (timezone('America/Sao_Paulo', l.scheduled_at))::date,
      e.amount,
      'pending'::public.charge_status,
      l.id
    from public.lessons l
    join public.enrollments e on e.id = l.enrollment_id
    join public.schedule_rules sr on sr.id = l.schedule_rule_id
    where e.organization_id = p_organization_id
      and e.active = true
      and e.billing_type = 'monthly'
      and l.status <> 'rescheduled'
      and sr.valid_to is not null
      and sr.valid_from = sr.valid_to
      and date_trunc('month', timezone('America/Sao_Paulo', l.scheduled_at))::date = v_competence
    on conflict (lesson_id) where lesson_id is not null do nothing
    returning id
  )
  select count(*)::integer into v_one_off from inserted;

  return coalesce(v_monthly, 0) + coalesce(v_lessons, 0) + coalesce(v_one_off, 0);
end;
$$;

comment on function public.ensure_month_charges(uuid, date) is
  'Gera a cobrança mensal (fixa ou soma das aulas) e cobranças extras de aula avulsa. Idempotente.';

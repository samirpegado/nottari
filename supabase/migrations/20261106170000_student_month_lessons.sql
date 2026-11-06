create or replace function public.student_home(p_token text)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_student_id uuid;
  v_result json;
  v_month_start date;
  v_month_end date;
begin
  v_student_id := private.student_id_for_session(p_token);
  if v_student_id is null then
    raise exception 'invalid or expired session' using errcode = '28000';
  end if;

  v_month_start := date_trunc('month', timezone('America/Sao_Paulo', now()))::date;
  v_month_end := (v_month_start + interval '1 month')::date;

  select json_build_object(
    'student', json_build_object(
      'id', s.id,
      'full_name', s.full_name,
      'stage_name', s.stage_name,
      'instrument', s.instrument,
      'skill_level', s.skill_level,
      'color', s.color
    ),
    'organization_name', o.name,
    'last_note', (
      select json_build_object(
        'piece', ln.piece,
        'bpm', ln.bpm,
        'measure', ln.measure,
        'homework', ln.homework,
        'notes', ln.notes,
        'at', l.scheduled_at,
        'status', l.status
      )
      from public.lesson_notes ln
      join public.lessons l on l.id = ln.lesson_id
      join public.enrollments e on e.id = l.enrollment_id
      where e.student_id = s.id
        and l.scheduled_at <= now()
        and l.status <> 'rescheduled'
      order by l.scheduled_at desc
      limit 1
    ),
    'upcoming', (
      select coalesce(json_agg(x), '[]'::json)
      from (
        select l.id, l.scheduled_at, l.duration_minutes, l.status
        from public.lessons l
        join public.enrollments e on e.id = l.enrollment_id
        where e.student_id = s.id
          and l.status <> 'rescheduled'
          and timezone('America/Sao_Paulo', l.scheduled_at)::date >= v_month_start
          and timezone('America/Sao_Paulo', l.scheduled_at)::date < v_month_end
        order by l.scheduled_at
      ) x
    ),
    'materials', (
      select coalesce(json_agg(x), '[]'::json)
      from (
        select m.id, m.title, m.type, m.external_url
        from public.materials m
        join public.material_assignments a on a.material_id = m.id
        where a.student_id = s.id
        order by m.title
      ) x
    )
  )
  into v_result
  from public.students s
  join public.organizations o on o.id = s.organization_id
  where s.id = v_student_id;

  return v_result;
end;
$function$;

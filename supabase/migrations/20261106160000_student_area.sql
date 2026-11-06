create or replace function public.student_login(p_phone text, p_pin text, p_user_agent text default null)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_student public.students;
  v_token text;
  v_expires timestamptz;
begin
  if p_pin !~ '^\d{4}$' then
    raise exception 'invalid credentials' using errcode = '28000';
  end if;
  if exists (
    select 1
    from public.students s
    where s.phone = p_phone
      and s.locked_until is not null
      and s.locked_until > now()
  ) then
    raise exception 'too many attempts, try again later' using errcode = '28000';
  end if;

  select * into v_student
  from public.students s
  where s.phone = p_phone
    and s.pin_lookup = private.hash_pin(p_pin)
    and s.active
  limit 1;

  if v_student.id is null then
    update public.students s
    set
      failed_login_attempts = s.failed_login_attempts + 1,
      locked_until = case
        when s.failed_login_attempts + 1 >= 5 then now() + interval '15 minutes'
        else s.locked_until
      end
    where s.phone = p_phone and s.active;
    raise exception 'invalid credentials' using errcode = '28000';
  end if;

  update public.students
  set failed_login_attempts = 0, locked_until = null, last_login_at = now()
  where id = v_student.id;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires := now() + interval '30 days';

  insert into public.student_sessions (organization_id, student_id, token_hash, user_agent, expires_at)
  values (
    v_student.organization_id,
    v_student.id,
    private.hash_session_token(v_token),
    p_user_agent,
    v_expires
  );

  return json_build_object(
    'student_id', v_student.id,
    'organization_id', v_student.organization_id,
    'full_name', v_student.full_name,
    'token', v_token,
    'expires_at', v_expires
  );
end;
$function$;

create or replace function public.student_home(p_token text)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_student_id uuid;
  v_result json;
begin
  v_student_id := private.student_id_for_session(p_token);
  if v_student_id is null then
    raise exception 'invalid or expired session' using errcode = '28000';
  end if;

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
          and l.scheduled_at >= now()
          and l.status in ('scheduled', 'makeup')
        order by l.scheduled_at
        limit 8
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

create or replace function public.student_open_material(p_token text, p_material_id uuid)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_student_id uuid;
  v_result json;
begin
  v_student_id := private.student_id_for_session(p_token);
  if v_student_id is null then
    raise exception 'invalid or expired session' using errcode = '28000';
  end if;

  select json_build_object(
    'id', m.id,
    'title', m.title,
    'type', m.type,
    'external_url', m.external_url,
    'storage_path', m.storage_path
  )
  into v_result
  from public.materials m
  join public.material_assignments a on a.material_id = m.id
  where m.id = p_material_id
    and a.student_id = v_student_id;

  if v_result is null then
    raise exception 'material not found' using errcode = '42501';
  end if;

  return v_result;
end;
$function$;

revoke all on function public.student_open_material(text, uuid) from public;
grant execute on function public.student_open_material(text, uuid) to anon, authenticated, service_role;

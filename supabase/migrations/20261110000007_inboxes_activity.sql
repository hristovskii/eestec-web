-- M19b inbox data and audit. Routing addresses and submissions are never public rows.
create type public.contact_status as enum ('new','answered','archived');
create type public.inquiry_status as enum ('new','in_progress','done');
create type public.membership_status as enum ('new','contacted','accepted','rejected');
create table public.contact_subjects (
  id uuid primary key default gen_random_uuid(), name jsonb not null check(public.is_localized(name)),
  team_label jsonb not null check(public.is_localized(team_label)), route_note jsonb not null check(public.is_localized(route_note)),
  shortcut_label jsonb not null check(public.is_localized(shortcut_label)), shortcut_url text not null default '',
  sort_order integer not null default 0, is_sample boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.contact_subject_routes (
  subject_id uuid primary key references public.contact_subjects(id) on delete cascade, route_email text not null,
  is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(), reference text not null unique, name text not null, email text,
  subject_id uuid references public.contact_subjects(id) on delete set null, subject text not null, routed_to text not null,
  message text not null, locale text not null check(locale in ('mk','en')), status public.contact_status not null default 'new',
  read_at timestamptz, consent_at timestamptz not null default now(), is_sample boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index contact_messages_subject_idx on public.contact_messages(subject_id);
create index contact_messages_status_idx on public.contact_messages(status, created_at);
create index contact_messages_read_idx on public.contact_messages(read_at);
create table public.partner_inquiries (
  id uuid primary key default gen_random_uuid(), reference text not null unique, contact_person text not null, email text, phone text not null default '',
  company text not null, interests text[] not null, message text not null, locale text not null check(locale in ('mk','en')),
  status public.inquiry_status not null default 'new', read_at timestamptz, consent_at timestamptz not null default now(),
  is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index partner_inquiries_status_idx on public.partner_inquiries(status, created_at);
create index partner_inquiries_read_idx on public.partner_inquiries(read_at);
create table public.membership_applications (
  id uuid primary key default gen_random_uuid(), reference text not null unique, name text not null, email text,
  phone text not null default '', faculty text not null default '', study_program text not null default '', year_of_study text not null default '',
  interests text[] not null default '{}', heard_from text not null default '', locale text not null check(locale in ('mk','en')),
  status public.membership_status not null default 'new', read_at timestamptz, consent_at timestamptz not null default now(),
  is_sample boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index membership_active_email_key on public.membership_applications(lower(trim(email))) where status <> 'rejected';
create index membership_status_idx on public.membership_applications(status,created_at);
create index membership_read_idx on public.membership_applications(read_at);
create table public.internal_notes (
  id uuid primary key default gen_random_uuid(), entity_type text not null check(entity_type in ('contact_message','partner_inquiry','membership_application','idea','feedback')),
  entity_id uuid not null, author uuid references auth.users(id) on delete set null, author_name text not null, author_initials text not null,
  body text not null check (char_length(body) between 1 and 1000), is_sample boolean not null default false, created_at timestamptz not null default now()
);
create index internal_notes_entity_idx on public.internal_notes(entity_type,entity_id,created_at);
create index internal_notes_author_idx on public.internal_notes(author);
create table public.activity_log (
  id uuid primary key default gen_random_uuid(), actor uuid references auth.users(id) on delete set null,
  actor_name text, actor_initials text, action text not null check (action in ('created','updated','published','deleted','approved','rejected','exported','uploaded','backup')),
  area text not null check (area in ('events','applications','approvals','inbox','memories','ideas','members','pages','partners','media','settings','users','system')), target text not null, href text,
  is_sample boolean not null default false, created_at timestamptz not null default now()
);
create index activity_log_created_idx on public.activity_log(created_at desc);
create index activity_log_actor_idx on public.activity_log(actor);

do $$
declare t text;
begin
  foreach t in array array['contact_subjects','contact_subject_routes','contact_messages','partner_inquiries','membership_applications'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',t || '_touch',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_staff())',t || ': staff read',t);
  end loop;
end $$;
alter table public.internal_notes enable row level security;
alter table public.activity_log enable row level security;
grant select on public.contact_subjects to anon;
create policy "contact subjects: public read" on public.contact_subjects for select using (true);
grant insert,update,delete on public.contact_subjects,public.contact_subject_routes to authenticated;
create policy "contact subjects: staff write" on public.contact_subjects for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "contact routes: staff write" on public.contact_subject_routes for all to authenticated using (public.is_staff()) with check (public.is_staff());
grant select on public.internal_notes, public.activity_log to authenticated;
create policy "notes: staff read" on public.internal_notes for select to authenticated using (public.is_staff());
create policy "activity: staff read" on public.activity_log for select to authenticated using (public.is_staff());

create function public.submit_contact_message(p_name text,p_email text,p_subject uuid,p_message text,p_locale text,p_consent boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare s public.contact_subjects; route text; ref text; y integer := extract(year from now() at time zone 'Europe/Skopje');
begin
  if p_consent is not true then raise exception 'Consent required' using errcode = '22023'; end if;
  select * into s from public.contact_subjects where id = p_subject;
  select route_email into route from public.contact_subject_routes where subject_id = p_subject;
  if s.id is null or route is null or trim(coalesce(p_name,'')) = '' or trim(coalesce(p_email,'')) = '' or trim(coalesce(p_message,'')) = '' or p_locale not in ('mk','en') then
    raise exception 'Invalid contact submission' using errcode = '22023';
  end if;
  ref := 'MSG-' || y || '-' || public.reference_suffix(public.next_reference_number('contact',y));
  insert into public.contact_messages(reference,name,email,subject_id,subject,routed_to,message,locale)
    values (ref,trim(p_name),trim(p_email),p_subject,coalesce(s.name->>p_locale,s.name->>'mk'),route,p_message,p_locale);
  return ref;
end $$;
grant execute on function public.submit_contact_message(text,text,uuid,text,text,boolean) to service_role;

create function public.submit_partner_inquiry(p_name text,p_email text,p_company text,p_phone text,p_interests text[],p_message text,p_locale text,p_consent boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare ref text; y integer := extract(year from now() at time zone 'Europe/Skopje');
begin
  if p_consent is not true then raise exception 'Consent required' using errcode = '22023'; end if;
  if trim(coalesce(p_name,'')) = '' or trim(coalesce(p_email,'')) = '' or trim(coalesce(p_company,'')) = '' or p_locale not in ('mk','en') then
    raise exception 'Invalid inquiry' using errcode = '22023';
  end if;
  ref := 'PRT-' || y || '-' || public.reference_suffix(public.next_reference_number('partner',y));
  insert into public.partner_inquiries(reference,contact_person,email,company,phone,interests,message,locale)
    values (ref,trim(p_name),trim(p_email),trim(p_company),coalesce(p_phone,''),coalesce(p_interests,'{}'),coalesce(p_message,''),p_locale);
  return ref;
end $$;
grant execute on function public.submit_partner_inquiry(text,text,text,text,text[],text,text,boolean) to service_role;

create function public.submit_membership(p_name text,p_email text,p_phone text,p_faculty text,p_study_program text,p_year text,p_interests text[],p_heard_from text,p_locale text,p_consent boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare ref text; y integer := extract(year from now() at time zone 'Europe/Skopje');
begin
  if p_consent is not true then raise exception 'Consent required' using errcode = '22023'; end if;
  if not coalesce((select (content #>> '{apply,open}')::boolean from public.page_content where page = 'join'),false) then
    raise exception 'Membership applications are closed' using errcode = '22023';
  end if;
  if trim(coalesce(p_name,'')) = '' or trim(coalesce(p_email,'')) = '' or p_locale not in ('mk','en') then raise exception 'Invalid application' using errcode = '22023'; end if;
  ref := 'MEM-' || y || '-' || public.reference_suffix(public.next_reference_number('membership',y));
  insert into public.membership_applications(reference,name,email,phone,faculty,study_program,year_of_study,interests,heard_from,locale)
    values (ref,trim(p_name),trim(p_email),coalesce(p_phone,''),coalesce(p_faculty,''),coalesce(p_study_program,''),coalesce(p_year,''),coalesce(p_interests,'{}'),coalesce(p_heard_from,''),p_locale);
  return ref;
end $$;
grant execute on function public.submit_membership(text,text,text,text,text,text,text[],text,text,boolean) to service_role;

create function public.set_inbox_status(p_kind text,p_id uuid,p_status text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_staff();
  case p_kind
    when 'contact_message' then update public.contact_messages set status = p_status::public.contact_status where id = p_id;
    when 'partner_inquiry' then update public.partner_inquiries set status = p_status::public.inquiry_status where id = p_id;
    when 'membership_application' then update public.membership_applications set status = p_status::public.membership_status where id = p_id;
    else raise exception 'Unknown inbox' using errcode = '22023';
  end case;
  return found;
end $$;
grant execute on function public.set_inbox_status(text,uuid,text) to authenticated;

create function public.set_inbox_read(p_kind text,p_id uuid,p_read_at timestamptz) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_staff();
  case p_kind
    when 'contact_message' then update public.contact_messages set read_at = p_read_at where id = p_id;
    when 'partner_inquiry' then update public.partner_inquiries set read_at = p_read_at where id = p_id;
    when 'membership_application' then update public.membership_applications set read_at = p_read_at where id = p_id;
    else raise exception 'Unknown inbox' using errcode = '22023';
  end case;
  return found;
end $$;
grant execute on function public.set_inbox_read(text,uuid,timestamptz) to authenticated;

create function public.add_internal_note(p_entity_type text,p_entity_id uuid,p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid; author_name text; initials text;
begin
  perform public.require_staff();
  select coalesce(nullif(r.display_name,''),nullif(p.full_name,''),u.email) into author_name
    from auth.users u left join public.admin_roles r on r.user_id = u.id left join public.profiles p on p.id = u.id
    where u.id = (select auth.uid());
  select upper(coalesce(string_agg(left(word,1),''),'')) into initials
    from (select word from regexp_split_to_table(author_name, '\s+') word limit 2) words;
  insert into public.internal_notes(entity_type,entity_id,author,author_name,author_initials,body)
    values (p_entity_type,p_entity_id,(select auth.uid()),author_name,initials,p_body) returning id into result;
  return result;
end $$;
grant execute on function public.add_internal_note(text,uuid,text) to authenticated;

create function public.record_activity(p_action text,p_area text,p_target text,p_href text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_staff();
  insert into public.activity_log(actor,actor_name,actor_initials,action,area,target,href)
    select (select auth.uid()),coalesce(r.display_name,p.full_name),null,p_action,p_area,p_target,p_href
      from public.admin_roles r left join public.profiles p on p.id = r.user_id where r.user_id = (select auth.uid());
end $$;
grant execute on function public.record_activity(text,text,text,text) to authenticated;

-- M19c extends the dashboard with Memories and ideas once those tables exist.
create function public.dashboard_counts() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare staff boolean := public.is_staff(); manager boolean := public.current_admin_role() = 'event_manager'; result jsonb;
begin
  if not staff and not coalesce(manager,false) then raise exception 'Not allowed' using errcode = '42501'; end if;
  with candidates as (
    select e.id, e.max_participants, e.waitlist, e.admission,
      count(a.id) as total, count(a.id) filter (where a.read_at is null) as unread,
      count(a.id) filter (where a.status = 'accepted') as taken,
      count(a.id) filter (where a.status = 'waitlist') as waiting
    from public.events e left join public.applications a on a.event_id = e.id
    where (staff or public.is_event_manager_of(e.id)) and e.status <> 'draft'
      and (e.publish_at is null or e.publish_at <= now()) and e.applications_enabled and e.apply_via = 'form'
      and (e.opens_at is null or e.opens_at <= now()) and e.starts_at > now()
      and (not coalesce((select (value->>'autoCloseApplications')::boolean from public.site_settings where key = 'events'),true)
        or e.deadline is null or e.deadline > now())
    group by e.id
  ), open_events as (
    select * from candidates where waitlist or (max_participants is null or taken < max_participants)
  )
  select jsonb_build_object(
    'memberRegistrations', jsonb_build_object(
      'count', case when staff then (select count(*) from public.profiles p join auth.users u on u.id = p.id where p.status = 'pending' and u.email_confirmed_at is not null) else 0 end,
      'oldestAt', case when staff then (select min(coalesce(u.email_confirmed_at,p.created_at)) from public.profiles p join auth.users u on u.id = p.id where p.status = 'pending' and u.email_confirmed_at is not null) else null end),
    'membershipApplications', jsonb_build_object('count',case when staff then (select count(*) from public.membership_applications where status = 'new') else 0 end),
    'messages', jsonb_build_object(
      'contact',case when staff then (select count(*) from public.contact_messages where status = 'new') else 0 end,
      'partners',case when staff then (select count(*) from public.partner_inquiries where status = 'new') else 0 end),
    'openEventApplications', jsonb_build_object('total',coalesce(sum(total),0),'newCount',coalesce(sum(unread),0),'events',count(*))
  ) into result from open_events;
  return result;
end $$;
grant execute on function public.dashboard_counts() to authenticated;

-- Only simple row events are logged here; bulk and export actions are recorded explicitly.
create function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a text; object_id uuid; label text; actor_name text; sample boolean; row_data jsonb; link text;
begin
  object_id := case when tg_op = 'DELETE' then old.id else new.id end;
  sample := case when tg_op = 'DELETE' then old.is_sample else new.is_sample end;
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  a := case tg_op when 'INSERT' then 'created' when 'DELETE' then 'deleted' else 'updated' end;
  label := coalesce(nullif(row_data->'title'->>'mk',''),nullif(row_data->>'reference',''),nullif(tg_argv[1],''),object_id::text);
  link := case when tg_table_name = 'events' then '/admin/events/' || object_id else null end;
  select coalesce(r.display_name,p.full_name) into actor_name from public.admin_roles r
    left join public.profiles p on p.id = r.user_id where r.user_id = (select auth.uid());
  insert into public.activity_log(actor,actor_name,action,area,target,href,is_sample)
    values ((select auth.uid()),actor_name,a,tg_argv[0],label,link,sample);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger audit_events after insert or update or delete on public.events for each row execute function public.audit_row_change('events','');
create trigger audit_contact_messages after update or delete on public.contact_messages for each row execute function public.audit_row_change('inbox','Contact message');
create trigger audit_partner_inquiries after update or delete on public.partner_inquiries for each row execute function public.audit_row_change('inbox','Partner inquiry');
create trigger audit_membership_applications after update or delete on public.membership_applications for each row execute function public.audit_row_change('inbox','Membership application');

do $$
declare t text;
begin
  foreach t in array array['contact_subjects','contact_subject_routes','contact_messages','partner_inquiries','membership_applications','internal_notes','activity_log'] loop
    execute format('create index %I on public.%I (is_sample) where is_sample',t || '_sample_idx',t);
  end loop;
end $$;

-- Contact page and private routing are saved together; subject labels and delivery addresses cannot diverge.
create function public.save_contact_page(p_content jsonb,p_subjects jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare subject jsonb; ids uuid[] := array[]::uuid[]; v_subject_id uuid;
begin
  perform public.require_staff();
  if jsonb_typeof(p_content) <> 'object' or p_content ? 'subjects' or jsonb_typeof(p_subjects) <> 'array' then
    raise exception 'Invalid contact page' using errcode = '22023';
  end if;
  insert into public.page_content(page,content) values ('contact',p_content)
    on conflict (page) do update set content = excluded.content;
  for subject in select value from jsonb_array_elements(p_subjects) loop
    v_subject_id := coalesce((subject->>'id')::uuid,gen_random_uuid());
    if v_subject_id = any(ids) then raise exception 'Duplicate subject' using errcode = '22023'; end if;
    ids := array_append(ids,v_subject_id);
    insert into public.contact_subjects(id,name,team_label,route_note,shortcut_label,shortcut_url,sort_order)
      values (v_subject_id,subject->'name',subject->'team_label',subject->'route_note',subject->'shortcut_label',coalesce(subject->>'shortcut_url',''),cardinality(ids))
      on conflict (id) do update set name = excluded.name,team_label = excluded.team_label,route_note = excluded.route_note,
        shortcut_label = excluded.shortcut_label,shortcut_url = excluded.shortcut_url,sort_order = excluded.sort_order;
    insert into public.contact_subject_routes(subject_id,route_email) values (v_subject_id,subject->>'route_email')
      on conflict (subject_id) do update set route_email = excluded.route_email;
  end loop;
  delete from public.contact_subjects where not id = any(ids);
end $$;
grant execute on function public.save_contact_page(jsonb,jsonb) to authenticated;
-- The combined save RPC is the only writer for subjects and their routes.
revoke insert, update, delete on public.contact_subjects, public.contact_subject_routes from authenticated;

create function public.mark_all_inbox_read(p_kind text,p_read_at timestamptz) returns integer
language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  perform public.require_staff();
  if p_read_at is null then raise exception 'A read time is required' using errcode = '22023'; end if;
  case p_kind
    when 'contact_message' then update public.contact_messages set read_at = p_read_at where read_at is null;
    when 'partner_inquiry' then update public.partner_inquiries set read_at = p_read_at where read_at is null;
    when 'membership_application' then update public.membership_applications set read_at = p_read_at where read_at is null;
    else raise exception 'Unknown inbox' using errcode = '22023';
  end case;
  get diagnostics changed = row_count;
  return changed;
end $$;
grant execute on function public.mark_all_inbox_read(text,timestamptz) to authenticated;

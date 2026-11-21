-- Board edits protect sample records from purge; counters and automatic timestamps do not.
create function public.protect_edited_sample() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.is_sample and new.is_sample and (select auth.uid()) is not null
    and coalesce(current_setting('eestec.purging',true),'') <> 'true'
    and (to_jsonb(old) - array['is_sample','updated_at','updated_by','reads_count','read_at']) is distinct from
        (to_jsonb(new) - array['is_sample','updated_at','updated_by','reads_count','read_at']) then
    new.is_sample := false;
  end if;
  return new;
end $$;

do $$
declare r record;
begin
  for r in select c.table_name from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'is_sample' and t.table_type = 'BASE TABLE'
  loop
    execute format('create trigger protect_sample_edit before update on public.%I for each row execute function public.protect_edited_sample()',r.table_name);
  end loop;
end $$;

-- A saved aggregate keeps its related sample content, not merely the parent row.
create function public.protect_sample_aggregate() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.is_sample and not new.is_sample and coalesce(current_setting('eestec.purging',true),'') <> 'true' then
    if tg_table_name = 'events' then
      update public.event_gallery set is_sample = false where event_id = new.id and is_sample;
      update public.application_forms set is_sample = false where event_id = new.id and is_sample;
    elsif tg_table_name = 'memories' then
      update public.memory_photos set is_sample = false where memory_id = new.id and is_sample;
      update public.memory_revision_photos set is_sample = false where revision_id in (select id from public.memory_revisions where memory_id = new.id) and is_sample;
      update public.memory_revisions set is_sample = false where memory_id = new.id and is_sample;
    elsif tg_table_name = 'board_mandates' then
      update public.board_members set is_sample = false where mandate_id = new.id and is_sample;
    elsif tg_table_name = 'page_content' and new.page = 'contact' then
      update public.contact_subjects set is_sample = false where is_sample;
      update public.contact_subject_routes set is_sample = false where is_sample;
    elsif tg_table_name = 'page_content' and new.page = 'partners' then
      update public.partner_packages set is_sample = false where is_sample;
    end if;
  end if;
  return new;
end $$;
create trigger protect_event_aggregate after update on public.events for each row execute function public.protect_sample_aggregate();
create trigger protect_memory_aggregate after update on public.memories for each row execute function public.protect_sample_aggregate();
create trigger protect_board_aggregate after update on public.board_mandates for each row execute function public.protect_sample_aggregate();
create trigger protect_page_aggregate after update on public.page_content for each row execute function public.protect_sample_aggregate();

create or replace function public.board_mandates_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.is_current and not (old.is_sample and coalesce(current_setting('eestec.purging',true),'') = 'true') then
      raise exception 'The current board cannot be deleted' using errcode = '23503';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and old.is_current and not new.is_current
     and exists (select 1 from public.board_mandates m where m.id <> old.id)
     and coalesce(current_setting('eestec.moving_current',true),'') <> 'on' then
    raise exception 'Mark another board as current instead' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and not exists (select 1 from public.board_mandates) then new.is_current := true; end if;
  return new;
end $$;

-- Preflight every ordinary FK from a real entity to a sample entity, plus join rows and JSON page media.
-- If there is any conflict, return a report before mutating even one row.
create function public.purge_sample_data() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r record; conflicts text[] := array[]::text[]; blocked boolean; sample_ids text[] := array[]::text[]; table_ids text[];
  actor_id uuid := (select auth.uid()); actor_label text;
begin
  -- Destructive and one-way: a super admin with a 2-step session only (D12, D18).
  if not public.is_super_admin() then
    raise exception 'Only a super admin with 2-step login can purge sample data' using errcode = '42501';
  end if;
  -- Freeze references for the preflight and deletion so a concurrent edit cannot create a new dangling link.
  for r in select tablename from pg_catalog.pg_tables where schemaname = 'public' order by tablename loop
    execute format('lock table public.%I in share row exclusive mode',r.tablename);
  end loop;
  lock table auth.users,storage.objects in share row exclusive mode;
  for r in
    select child.relname as child_table, ca.attname as child_column, parent.relname as parent_table, pa.attname as parent_column
    from pg_constraint fk
    join pg_class child on child.oid = fk.conrelid join pg_namespace cn on cn.oid = child.relnamespace
    join pg_class parent on parent.oid = fk.confrelid join pg_namespace pn on pn.oid = parent.relnamespace
    join pg_attribute ca on ca.attrelid = child.oid and ca.attnum = fk.conkey[1]
    join pg_attribute pa on pa.attrelid = parent.oid and pa.attnum = fk.confkey[1]
    where fk.contype = 'f' and cn.nspname = 'public' and pn.nspname = 'public'
      and cardinality(fk.conkey) = 1 and cardinality(fk.confkey) = 1
      and exists(select 1 from pg_attribute a where a.attrelid = child.oid and a.attname = 'is_sample' and not a.attisdropped)
      and exists(select 1 from pg_attribute a where a.attrelid = parent.oid and a.attname = 'is_sample' and not a.attisdropped)
  loop
    execute format('select exists(select 1 from public.%I c join public.%I p on c.%I = p.%I where not c.is_sample and p.is_sample)',
      r.child_table,r.parent_table,r.child_column,r.parent_column) into blocked;
    if blocked then conflicts := array_append(conflicts,r.child_table || '.' || r.child_column || ' -> ' || r.parent_table); end if;
  end loop;
  for r in
    select child.relname as child_table, ca.attname as child_column
    from pg_constraint fk join pg_class child on child.oid = fk.conrelid join pg_namespace cn on cn.oid = child.relnamespace
      join pg_attribute ca on ca.attrelid = child.oid and ca.attnum = fk.conkey[1]
    where fk.contype = 'f' and cn.nspname = 'public' and fk.confrelid = 'auth.users'::regclass
      and cardinality(fk.conkey) = 1 and cardinality(fk.confkey) = 1
      and exists(select 1 from pg_attribute a where a.attrelid = child.oid and a.attname = 'is_sample' and not a.attisdropped)
  loop
    execute format('select exists(select 1 from public.%I c join auth.users u on c.%I = u.id where not c.is_sample and u.raw_app_meta_data->>''is_sample'' = ''true'')',
      r.child_table,r.child_column) into blocked;
    if blocked then conflicts := array_append(conflicts,r.child_table || '.' || r.child_column || ' -> sample Auth user'); end if;
  end loop;
  if exists(select 1 from public.cv_export_log x left join public.profiles p on p.id=x.profile_id left join public.sponsors s on s.id=x.sponsor_id
    left join auth.users u on u.id=x.exported_by where p.is_sample or s.is_sample or u.raw_app_meta_data->>'is_sample' = 'true') then
    conflicts := array_append(conflicts,'CV export log -> sample entity');
  end if;
  if exists(select 1 from public.internal_notes n where not n.is_sample and (
    (n.entity_type='contact_message' and exists(select 1 from public.contact_messages x where x.id=n.entity_id and x.is_sample)) or
    (n.entity_type='partner_inquiry' and exists(select 1 from public.partner_inquiries x where x.id=n.entity_id and x.is_sample)) or
    (n.entity_type='membership_application' and exists(select 1 from public.membership_applications x where x.id=n.entity_id and x.is_sample)) or
    (n.entity_type='idea' and exists(select 1 from public.ideas x where x.id=n.entity_id and x.is_sample)) or
    (n.entity_type='feedback' and exists(select 1 from public.feedback x where x.id=n.entity_id and x.is_sample))
  )) then conflicts := array_append(conflicts,'real internal note -> sample submission'); end if;
  if exists(select 1 from public.board_mandates where is_current and is_sample) and
     exists(select 1 from public.board_mandates where not is_sample) then
    conflicts := array_append(conflicts,'choose a real current board before purging');
  end if;
  if exists(select 1 from public.member_teams l join public.profiles p on p.id=l.profile_id join public.teams t on t.id=l.team_id where not p.is_sample and t.is_sample) then conflicts := array_append(conflicts,'member_teams -> sample team'); end if;
  if exists(select 1 from public.member_badges l join public.profiles p on p.id=l.profile_id join public.badges b on b.id=l.badge_id where not p.is_sample and b.is_sample) then conflicts := array_append(conflicts,'member_badges -> sample badge'); end if;
  if exists(select 1 from public.event_topic_links l join public.events e on e.id=l.event_id join public.event_topics t on t.id=l.topic_id where not e.is_sample and t.is_sample) then conflicts := array_append(conflicts,'event_topic_links -> sample topic'); end if;
  if exists(select 1 from public.event_partners l join public.events e on e.id=l.event_id join public.sponsors p on p.id=l.sponsor_id where not e.is_sample and p.is_sample) then conflicts := array_append(conflicts,'event_partners -> sample sponsor'); end if;
  if exists(select 1 from public.event_managers l join public.events e on e.id=l.event_id join auth.users u on u.id=l.user_id
    where (not e.is_sample and coalesce(u.raw_app_meta_data->>'is_sample' = 'true',false)) or
      (e.is_sample and not coalesce(u.raw_app_meta_data->>'is_sample' = 'true',false))) then conflicts := array_append(conflicts,'event_managers mixes sample and real entities'); end if;
  if exists(select 1 from public.profiles p join auth.users u on u.id=p.id where not p.is_sample and coalesce(u.raw_app_meta_data->>'is_sample' = 'true',false)) or
     exists(select 1 from public.admin_roles a join auth.users u on u.id=a.user_id where not a.is_sample and coalesce(u.raw_app_meta_data->>'is_sample' = 'true',false)) then
    conflicts := array_append(conflicts,'real account refers to sample Auth user');
  end if;
  if exists(select 1 from storage.objects o join auth.users u on o.owner_id=u.id::text or o.owner=u.id where coalesce(u.raw_app_meta_data->>'is_sample' = 'true',false)) then
    conflicts := array_append(conflicts,'sample Auth users still own Storage objects');
  end if;
  -- JSON aggregates may embed IDs without foreign keys (page sections, branding, revision covers).
  for r in select c.table_name from information_schema.columns c
    join information_schema.columns ids on ids.table_schema=c.table_schema and ids.table_name=c.table_name and ids.column_name='id' and ids.data_type='uuid'
    where c.table_schema='public' and c.column_name='is_sample'
  loop
    execute format('select coalesce(array_agg(id::text),array[]::text[]) from public.%I where is_sample',r.table_name) into table_ids;
    sample_ids := sample_ids || table_ids;
  end loop;
  for r in select j.table_name,j.column_name from information_schema.columns j
    join information_schema.columns marker on marker.table_schema=j.table_schema and marker.table_name=j.table_name and marker.column_name='is_sample'
    where j.table_schema='public' and j.data_type='jsonb'
  loop
    execute format('select exists(select 1 from public.%I c cross join lateral jsonb_path_query(c.%I,''$.**'') x(value) where not c.is_sample and jsonb_typeof(x.value) = ''string'' and (x.value #>> ''{}'') = any($1))',
      r.table_name,r.column_name) into blocked using sample_ids;
    if blocked then conflicts := array_append(conflicts,r.table_name || '.' || r.column_name || ' -> sample entity'); end if;
  end loop;
  if cardinality(conflicts) > 0 then return jsonb_build_object('status','blocked','references',to_jsonb(conflicts)); end if;

  select coalesce(nullif(r2.display_name,''),nullif(p.full_name,''),u.email) into actor_label
    from auth.users u left join public.admin_roles r2 on r2.user_id = u.id left join public.profiles p on p.id = u.id where u.id = actor_id;
  perform set_config('eestec.purging','true',true);
  insert into public.storage_cleanup_queue(bucket,path,reason)
    select m.bucket,m.path,'sample data purge' from public.media m where m.is_sample and m.bucket is not null and m.path is not null
      and not exists(select 1 from public.storage_cleanup_queue q where q.bucket = m.bucket and q.path = m.path);
  -- Delete leaf entities before parents; cascades remove sample-only join rows.
  delete from public.internal_notes where is_sample;
  delete from public.submission_files where is_sample;
  delete from public.feedback where is_sample;
  delete from public.ideas where is_sample;
  delete from public.memory_revision_photos where is_sample;
  delete from public.memory_revisions where is_sample;
  delete from public.memory_photos where is_sample;
  delete from public.memories where is_sample;
  delete from public.application_files where is_sample;
  delete from public.applications where is_sample;
  delete from public.application_forms where is_sample;
  delete from public.contact_messages where is_sample;
  delete from public.partner_inquiries where is_sample;
  delete from public.membership_applications where is_sample;
  delete from public.contact_subject_routes where is_sample;
  delete from public.contact_subjects where is_sample;
  delete from public.event_gallery where is_sample;
  delete from public.board_members where is_sample;
  delete from public.member_accounts where is_sample;
  delete from public.admin_roles where is_sample;
  delete from public.profiles where is_sample;
  delete from public.board_mandates where is_sample;
  delete from public.board_roles where is_sample;
  delete from public.events where is_sample;
  delete from public.sponsors where is_sample;
  delete from public.sponsor_tiers where is_sample;
  delete from public.event_topics where is_sample;
  delete from public.event_types where is_sample;
  delete from public.idea_types where is_sample;
  delete from public.partner_packages where is_sample;
  delete from public.seo_pages where is_sample;
  delete from public.social_links where is_sample;
  delete from public.committees where is_sample;
  delete from public.page_content where is_sample;
  delete from public.site_settings where is_sample;
  delete from public.teams where is_sample;
  delete from public.badges where is_sample;
  delete from public.media where is_sample;
  delete from public.activity_log where is_sample;
  delete from auth.users where coalesce(raw_app_meta_data->>'is_sample' = 'true',false);
  perform set_config('eestec.purging','false',true);
  -- The actor's own admin role may have been a sample row, so the entry is written from what was read before the purge.
  insert into public.activity_log(actor,actor_name,actor_initials,action,area,target)
    values ((select u.id from auth.users u where u.id = actor_id),actor_label,public.activity_initials(actor_label),'deleted','system','Sample data purged');
  return jsonb_build_object('status','purged');
end $$;
grant execute on function public.purge_sample_data() to authenticated;

-- An aggregate can change through a child without changing any parent columns.
create function public.protect_edited_sample_parent() returns trigger
language plpgsql security definer set search_path = '' as $$
declare row_data jsonb; parent_id uuid;
begin
  if (select auth.uid()) is null or coalesce(current_setting('eestec.purging',true),'') = 'true' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  if tg_table_name in ('event_gallery','application_forms','event_topic_links','event_partners','event_managers') then
    parent_id := (row_data->>'event_id')::uuid;
    update public.events set is_sample = false where id = parent_id and is_sample;
  elsif tg_table_name in ('memory_photos','memory_revisions') then
    parent_id := (row_data->>'memory_id')::uuid;
    update public.memories set is_sample = false where id = parent_id and is_sample;
  elsif tg_table_name = 'memory_revision_photos' then
    select memory_id into parent_id from public.memory_revisions where id = (row_data->>'revision_id')::uuid;
    update public.memories set is_sample = false where id = parent_id and is_sample;
  elsif tg_table_name in ('member_teams','member_badges') then
    parent_id := (row_data->>'profile_id')::uuid;
    update public.profiles set is_sample = false where id = parent_id and is_sample;
  elsif tg_table_name = 'board_members' then
    parent_id := (row_data->>'mandate_id')::uuid;
    update public.board_mandates set is_sample = false where id = parent_id and is_sample;
  elsif tg_table_name in ('contact_subjects','contact_subject_routes') then
    update public.page_content set is_sample = false where page = 'contact' and is_sample;
  elsif tg_table_name = 'partner_packages' then
    update public.page_content set is_sample = false where page = 'partners' and is_sample;
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array['event_gallery','application_forms','event_topic_links','event_partners','event_managers',
    'memory_photos','memory_revisions','memory_revision_photos','member_teams','member_badges','board_members',
    'contact_subjects','contact_subject_routes','partner_packages'] loop
    execute format('create trigger protect_sample_parent after insert or update or delete on public.%I for each row execute function public.protect_edited_sample_parent()',t);
  end loop;
end $$;

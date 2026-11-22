-- What a visitor may read about ideas: the event ids of accepted ideas, and nothing else.
begin;
\ir ../helpers/isolate.inc
select plan(6);
insert into public.idea_types(id,name) values ('93000000-0000-0000-0000-000000000001','{"mk":"Idea"}');
insert into public.event_types(id,name) values ('91000000-0000-0000-0000-000000000001','{"mk":"Type"}');
insert into public.events(id,slug,title,short_description,scope,type_id,starts_at,ends_at,location,city,country,description,requirements,seo_title,seo_description,status)
select ('92000000-0000-0000-0000-00000000000' || n)::uuid, 'idea-event-' || n, '{"mk":"Event"}', '{"mk":"Short"}', 'local',
  '91000000-0000-0000-0000-000000000001', now(), now() + interval '1 day', '{"mk":"Here"}', '{"mk":"City"}', '{"mk":"MK"}',
  '{"mk":""}', '{"mk":""}', '{"mk":""}', '{"mk":""}', 'draft'
from generate_series(1, 3) n;
insert into public.ideas(reference,type_id,title,description,locale,is_anonymous,status,event_draft_id,created_at) values
 ('IDE-9999-0001','93000000-0000-0000-0000-000000000001','Accepted old','Body','en',true,'accepted','92000000-0000-0000-0000-000000000001', now() - interval '2 days'),
 ('IDE-9999-0002','93000000-0000-0000-0000-000000000001','Accepted new','Body','en',true,'accepted','92000000-0000-0000-0000-000000000002', now() - interval '1 day'),
 ('IDE-9999-0003','93000000-0000-0000-0000-000000000001','Archived','Body','en',true,'archived','92000000-0000-0000-0000-000000000003', now()),
 ('IDE-9999-0004','93000000-0000-0000-0000-000000000001','Accepted, no draft','Body','en',true,'accepted',null, now());
create function pg_temp.visitor() returns void language plpgsql as $$ begin
 reset role; perform set_config('request.jwt.claims','{"role":"anon"}',true); set local role anon;
end $$;
grant execute on all functions in schema pg_temp to anon;
select pg_temp.visitor();
select is(public.accepted_idea_events(), array['92000000-0000-0000-0000-000000000002','92000000-0000-0000-0000-000000000001']::uuid[],
  'a visitor gets the events of accepted ideas, newest first');
select is(public.accepted_idea_events(1), array['92000000-0000-0000-0000-000000000002']::uuid[], 'up to the limit');
select is(public.accepted_idea_events(0), array['92000000-0000-0000-0000-000000000002']::uuid[], 'a limit below one is one');
select is(cardinality(public.accepted_idea_events(null)), 2, 'no limit means the default');
select throws_ok($$select id from public.ideas$$, '42501', null, 'the ideas table itself stays closed');
select throws_ok($$select 1 from public.submission_files$$, '42501', null, 'and so do their files');
select * from finish(); rollback;

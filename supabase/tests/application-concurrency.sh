#!/usr/bin/env bash
# Concurrent first-come submissions must allocate one place and one waitlist position.
set -euo pipefail
container="supabase_db_eestec-lc-skopje"
run_sql() { docker exec -i "$container" psql -X -q -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"; }
event_id='52000000-0000-0000-0000-000000000001'
type_id='51000000-0000-0000-0000-000000000001'
cleanup() {
  run_sql >/dev/null <<SQL
    delete from public.events where id = '$event_id';
    delete from public.event_types where id = '$type_id';
    delete from public.activity_log where href = '/admin/events/$event_id';
    delete from public.reference_counters where kind = 'application:QXZ' and year = 2277;
SQL
}
# Never reuse or delete an existing event, type, or reference counter.
run_sql <<SQL
  do \$\$ begin
    if exists (select 1 from public.events where id = '$event_id' or slug = 'qxz-concurrency-test') or
       exists (select 1 from public.event_types where id = '$type_id') or
       exists (select 1 from public.reference_counters where kind = 'application:QXZ' and year = 2277) then
      raise exception 'Concurrency fixture already exists';
    end if;
  end \$\$;
SQL
trap cleanup EXIT
run_sql <<SQL
  insert into public.event_types(id,name,is_sample) values ('$type_id','{"mk":"Concurrency"}',true);
  insert into public.events(id,slug,title,short_description,scope,type_id,starts_at,ends_at,location,city,country,description,requirements,seo_title,seo_description,status,applications_enabled,admission,max_participants,waitlist,deadline,is_sample)
  values ('$event_id','qxz-concurrency-test','{"mk":"Test"}','{"mk":"Short"}','local','$type_id','2277-01-01 00:00+00','2277-01-02 00:00+00','{"mk":"Here"}','{"mk":"City"}','{"mk":"MK"}','{"mk":""}','{"mk":""}','{"mk":""}','{"mk":""}','published',true,'first_come',1,true,'2276-12-31 00:00+00',true);
SQL
run_sql -c "select public.submit_application('$event_id','First','first@example.test','{}','en',true);" >/dev/null &
first=$!
run_sql -c "select public.submit_application('$event_id','Second','second@example.test','{}','en',true);" >/dev/null &
second=$!
wait "$first"
wait "$second"
# pgTAP checks run after both independent transactions commit.
output=$(run_sql -t -A <<SQL
  begin;
  create extension if not exists pgtap with schema extensions;
  set local search_path = public, extensions;
  select plan(2);
  select is((select count(*)::integer from public.applications where event_id = '$event_id' and status = 'accepted'),1,'exactly one place allocated');
  select is((select count(*)::integer from public.applications where event_id = '$event_id' and status = 'waitlist'),1,'the other applicant waits');
  select * from finish();
  rollback;
SQL
)
printf '%s\n' "$output"
if [[ "$output" != *'ok 1 - exactly one place allocated'* || "$output" != *'ok 2 - the other applicant waits'* || "$output" == *'not ok'* ]]; then exit 1; fi

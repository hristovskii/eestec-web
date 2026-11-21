#!/usr/bin/env bash
# Check competing Memory decisions, simultaneous hits of the shared /submit limit, two board members accepting
# the same idea, and an account deletion racing a Memory save.
set -euo pipefail
container='supabase_db_eestec-lc-skopje'
run_sql() { docker exec -i "$container" psql -X -q -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"; }
user='d0000000-0000-0000-0000-000000000001'
editor='d0000000-0000-0000-0000-000000000002'
memory='d1000000-0000-0000-0000-000000000001'
user2='d0000000-0000-0000-0000-000000000003'
memory2='d1000000-0000-0000-0000-000000000002'
idea='d4000000-0000-0000-0000-000000000001'
idea_type='d3000000-0000-0000-0000-000000000001'
event_type='d2000000-0000-0000-0000-000000000001'
hash='d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1'
tmp=$(mktemp -d)
cleanup() {
  run_sql >/dev/null <<SQL
    delete from public.memories where id in ('$memory','$memory2');
    delete from public.ideas where id = '$idea';
    delete from public.events where slug = 'race-idea-event';
    delete from public.idea_types where id = '$idea_type';
    delete from public.event_types where id = '$event_type';
    delete from public.account_deletion_jobs where user_id = '$user2';
    delete from auth.users where id in ('$user','$editor','$user2');
    delete from public.submission_log where device_hash = '$hash';
SQL
  rm -rf "$tmp"
}
run_sql <<SQL
  do \$\$ begin
    if exists(select 1 from auth.users where id in ('$user','$editor','$user2')) or
       exists(select 1 from public.events where slug = 'race-idea-event') or exists(select 1 from public.ideas where id = '$idea') or
       exists(select 1 from public.memories where id = '$memory') or
       exists(select 1 from public.submission_log where device_hash = '$hash') then
      raise exception 'Concurrency fixture already exists';
    end if;
  end \$\$;
SQL
trap cleanup EXIT
run_sql <<SQL
  insert into auth.users(id,aud,role,email) values
    ('$user','authenticated','authenticated','memory-race-author@example.invalid'),
    ('$editor','authenticated','authenticated','memory-race-editor@example.invalid');
  insert into public.profiles(id,username,full_name,status) values ('$user','memory-race-author','Memory Race Author','active');
  insert into public.admin_roles(user_id,role,display_name) values ('$editor','editor','Memory Race Editor');
  insert into public.memories(id,author_id,slug,status,title,body,submitted_at) values
    ('$memory','$user','memory-race-test','pending','Memory race','Story',now());
  insert into auth.users(id,aud,role,email) values ('$user2','authenticated','authenticated','memory-race-leaver@example.invalid');
  insert into public.profiles(id,username,full_name,status) values ('$user2','memory-race-leaver','Memory Race Leaver','active');
  insert into public.memories(id,author_id,status,title,body) values ('$memory2','$user2','draft','Deletion race','Story');
  insert into public.event_types(id,name) values ('$event_type','{"mk":"Race"}');
  insert into public.idea_types(id,name) values ('$idea_type','{"mk":"Race"}');
  insert into public.ideas(id,reference,type_id,title,description,locale) values ('$idea','RACE-IDE-1','$idea_type','Idea','Description','en');
SQL
claims="{\"sub\":\"$editor\",\"role\":\"authenticated\",\"aal\":\"aal1\"}"
run_sql -t -A -c "set request.jwt.claims = '$claims'; set role authenticated; select public.memory_decide('$memory',true)->>'status';" > "$tmp/approve" &
a=$!
run_sql -t -A -c "set request.jwt.claims = '$claims'; set role authenticated; select public.memory_decide('$memory',false,'No')->>'status';" > "$tmp/reject" &
b=$!
wait "$a"
wait "$b"
for n in 1 2 3 4 5 6; do
  run_sql -t -A -c "select public.rate_limit_hit('$hash')->>'allowed';" > "$tmp/rate-$n" &
done
wait
# Two editors accepting the same idea must produce one draft event and the same answer.
event_data="{\"slug\":\"race-idea-event\",\"title\":{\"mk\":\"Race\"},\"short_description\":{\"mk\":\"\"},\"scope\":\"local\",\"type_id\":\"$event_type\",\"starts_at\":\"2030-01-01T10:00:00Z\",\"ends_at\":\"2030-01-02T10:00:00Z\",\"location\":{\"mk\":\"\"},\"city\":{\"mk\":\"\"},\"country\":{\"mk\":\"\"},\"description\":{\"mk\":\"\"},\"requirements\":{\"mk\":\"\"},\"seo_title\":{\"mk\":\"\"},\"seo_description\":{\"mk\":\"\"}}"
for n in 1 2; do
  run_sql -t -A -c "set request.jwt.claims = '$claims'; set role authenticated; select public.accept_idea('$idea','$event_data'::jsonb);" > "$tmp/accept-$n" &
done
wait
accepted_ids=$(cat "$tmp"/accept-* | sort -u | wc -l | tr -d ' ')
accepted_events=$(run_sql -t -A -c "select count(*) from public.events where slug = 'race-idea-event';")
if [[ "$accepted_ids" != '1' || "$accepted_events" != '1' ]]; then
  printf 'Competing idea acceptance created %s answers and %s events\n' "$accepted_ids" "$accepted_events" >&2; exit 1
fi

# An account deletion racing a Memory save must never leave a Memory with the deleted author.
claims2="{\"sub\":\"$user2\",\"role\":\"authenticated\",\"aal\":\"aal1\"}"
run_sql -t -A -c "set request.jwt.claims = '$claims2'; set role authenticated; select public.memory_save_draft('$memory2','{\"title\":\"Edited\",\"body\":\"Late\",\"photos\":[]}'::jsonb);" > "$tmp/save" 2>/dev/null &
c=$!
run_sql -t -A -c "select public.begin_member_deletion('$user2',false)->>'status';" > "$tmp/delete" &
d=$!
wait "$c" || true
wait "$d"
leftover=$(run_sql -t -A -c "select count(*) from public.memories where author_id = '$user2';")
if [[ "$leftover" != '0' ]]; then printf 'A Memory of the deleted author survived the race: %s\n' "$leftover" >&2; exit 1; fi
outcomes=$(cat "$tmp/approve" "$tmp/reject" | sort | tr '\n' ' ')
allowed=$(grep -h -c '^true$' "$tmp"/rate-* | awk '{s+=$1} END {print s+0}')
blocked=$(grep -h -c '^false$' "$tmp"/rate-* | awk '{s+=$1} END {print s+0}')
if [[ "$outcomes" != 'approved not_pending ' && "$outcomes" != 'not_pending rejected ' ]]; then
  printf 'Unexpected competing decision results: %s\n' "$outcomes" >&2; exit 1
fi
if [[ "$allowed" != '5' || "$blocked" != '1' ]]; then
  printf 'Rate-limit race allowed %s and blocked %s\n' "$allowed" "$blocked" >&2; exit 1
fi
result=$(run_sql -t -A -c "select count(*) from public.submission_log where device_hash = '$hash';")
if [[ "$result" != '5' ]]; then printf 'Unexpected retained hit count: %s\n' "$result" >&2; exit 1; fi
printf 'Competing decisions: %s\nConcurrent rate limit: %s allowed, %s blocked\nIdea accepted once; deletion vs save left no Memory\n' "$outcomes" "$allowed" "$blocked"

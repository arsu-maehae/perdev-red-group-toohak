-- Run with: supabase test db
-- These assertions execute inside the local Supabase PostgreSQL instance.
begin;

create extension if not exists pgtap with schema extensions;
select plan(1);

do $$
declare v_missing text;
begin
  select string_agg(name, ', ') into v_missing from (values
    ('quizzes'),('questions'),('game_sessions'),('session_questions'),('session_answer_keys'),
    ('game_players'),('game_answers'),('assignments'),('assignment_questions'),('practice_attempts'),('practice_answers')
  ) t(name) where not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=t.name and c.relrowsecurity
  );
  if v_missing is not null then raise exception 'RLS missing on: %', v_missing; end if;

  if exists(select 1 from information_schema.role_table_grants where grantee in ('anon','authenticated') and table_schema='public' and table_name in ('session_answer_keys','session_questions','game_answers','assignment_questions') and privilege_type='SELECT')
    then raise exception 'A client role can directly read protected answer data'; end if;

  if public.normalize_typed_answer('  ＴＯＯＨＡＫ   Red ') <> 'toohak red' then raise exception 'Typed normalization failed'; end if;
  if public.score_answer(true,10000,20,'standard') <> 750 then raise exception 'Timed scoring failed'; end if;
  if public.score_answer(false,0,20,'double') <> 0 then raise exception 'Incorrect answers must score zero'; end if;
  if not public.answer_is_correct('multiple','["a","c"]','{a,c}','{}') then raise exception 'Exact set match failed'; end if;
  if public.answer_is_correct('multiple','["a"]','{a,c}','{}') then raise exception 'Partial multi-select must fail'; end if;
end $$;

-- Prove that an authenticated host cannot cross an ownership boundary even
-- when they know another host's UUIDs.
insert into auth.users(id,email,aud,role,encrypted_password,raw_app_meta_data,raw_user_meta_data)
values
  ('10000000-0000-0000-0000-000000000001','owner-one@test.local','authenticated','authenticated','x','{}','{}'),
  ('20000000-0000-0000-0000-000000000002','owner-two@test.local','authenticated','authenticated','x','{}','{}');
insert into public.quizzes(id,owner_id,title,status)
values('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','Private quiz','draft');
insert into public.game_sessions(id,host_id,quiz_id,quiz_title,pin)
values('40000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000003','Private quiz','654321');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}',true);
do $$
begin
  if exists(select 1 from public.quizzes where id='30000000-0000-0000-0000-000000000003') then
    raise exception 'RLS exposed another host''s private quiz';
  end if;
  begin
    perform public.get_session_report('40000000-0000-0000-0000-000000000004');
    raise exception 'CROSS_HOST_REPORT_WAS_EXPOSED';
  exception when others then
    if sqlerrm='CROSS_HOST_REPORT_WAS_EXPOSED' then raise; end if;
  end;
end $$;
reset role;

select pass('RLS ownership, report isolation, secrecy, normalization, exact-set matching, and scoring checks passed');
select * from finish();

rollback;

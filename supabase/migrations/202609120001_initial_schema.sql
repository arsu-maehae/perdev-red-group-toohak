-- Toohak — Red Group
-- Authoritative quiz, live-game, practice, reporting, storage, and RLS schema.

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.quiz_status as enum ('draft', 'published');
create type public.question_kind as enum ('single', 'true_false', 'multiple', 'typed', 'poll');
create type public.points_mode as enum ('standard', 'double', 'none');
create type public.game_phase as enum ('lobby', 'countdown', 'question_open', 'reveal', 'leaderboard', 'final', 'ended');

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  cover_path text,
  status public.quiz_status not null default 'draft',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  position integer not null check (position >= 0),
  kind public.question_kind not null,
  prompt text not null check (char_length(prompt) between 1 and 300),
  options jsonb not null default '[]'::jsonb,
  accepted_answers text[] not null default '{}',
  explanation text not null default '' check (char_length(explanation) <= 500),
  image_path text,
  time_limit integer not null default 20 check (time_limit between 5 and 300),
  points_mode public.points_mode not null default 'standard',
  unique (quiz_id, position)
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid references public.quizzes(id) on delete set null,
  quiz_title text not null,
  pin text not null unique check (pin ~ '^\d{6}$'),
  phase public.game_phase not null default 'lobby',
  current_question_index integer not null default -1,
  phase_started_at timestamptz,
  phase_ends_at timestamptz,
  locked boolean not null default false,
  host_last_seen timestamptz not null default now(),
  state_version bigint not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 hours'),
  ended_at timestamptz
);

create table public.session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  source_question_id uuid,
  position integer not null,
  kind public.question_kind not null,
  prompt text not null,
  public_options jsonb not null default '[]',
  explanation text not null default '',
  image_path text,
  time_limit integer not null,
  points_mode public.points_mode not null,
  unique (session_id, position)
);

-- Deliberately separate from public question content. No client role receives SELECT.
create table public.session_answer_keys (
  question_id uuid primary key references public.session_questions(id) on delete cascade,
  correct_option_ids text[] not null default '{}',
  accepted_answers text[] not null default '{}'
);

create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  nickname citext not null check (char_length(nickname::text) between 2 and 24),
  score integer not null default 0,
  streak integer not null default 0,
  removed boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (session_id, auth_user_id),
  unique (session_id, nickname)
);

create table public.game_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  question_id uuid not null references public.session_questions(id) on delete cascade,
  player_id uuid not null references public.game_players(id) on delete cascade,
  answer jsonb not null,
  submitted_at timestamptz not null default now(),
  response_ms integer not null check (response_ms >= 0),
  is_correct boolean not null,
  points integer not null check (points >= 0),
  unique (question_id, player_id)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid references public.quizzes(id) on delete set null,
  quiz_title text not null,
  title text not null check (char_length(title) between 1 and 120),
  deadline timestamptz,
  created_at timestamptz not null default now()
);

create table public.assignment_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  position integer not null,
  kind public.question_kind not null,
  prompt text not null,
  public_options jsonb not null default '[]',
  explanation text not null default '',
  image_path text,
  time_limit integer not null,
  points_mode public.points_mode not null,
  correct_option_ids text[] not null default '{}',
  accepted_answers text[] not null default '{}',
  unique (assignment_id, position)
);

create table public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 24),
  current_index integer not null default 0,
  question_started_at timestamptz not null default now(),
  score integer not null default 0,
  completed_at timestamptz,
  started_at timestamptz not null default now()
);

create table public.practice_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.practice_attempts(id) on delete cascade,
  question_id uuid not null references public.assignment_questions(id) on delete cascade,
  answer jsonb not null,
  submitted_at timestamptz not null default now(),
  response_ms integer not null,
  is_correct boolean not null,
  points integer not null,
  unique (attempt_id, question_id)
);

create table public.action_rate_limits (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);
create index action_rate_limits_lookup on public.action_rate_limits(actor_id, action, created_at desc);
create index game_players_session on public.game_players(session_id) where not removed;
create index game_answers_session_question on public.game_answers(session_id, question_id);
create index practice_attempts_assignment on public.practice_attempts(assignment_id);

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger quizzes_touch before update on public.quizzes for each row execute function public.touch_updated_at();

alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.game_sessions enable row level security;
alter table public.session_questions enable row level security;
alter table public.session_answer_keys enable row level security;
alter table public.game_players enable row level security;
alter table public.game_answers enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_questions enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.practice_answers enable row level security;
alter table public.action_rate_limits enable row level security;

create policy "hosts own quizzes" on public.quizzes for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "hosts own questions" on public.questions for all to authenticated
  using (exists (select 1 from public.quizzes q where q.id = quiz_id and q.owner_id = auth.uid()))
  with check (exists (select 1 from public.quizzes q where q.id = quiz_id and q.owner_id = auth.uid()));

create or replace function public.can_access_session(p_session_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.game_sessions s where s.id = p_session_id and s.host_id = auth.uid())
    or exists(select 1 from public.game_players p where p.session_id = p_session_id and p.auth_user_id = auth.uid() and not p.removed);
$$;
revoke all on function public.can_access_session(uuid) from public;
grant execute on function public.can_access_session(uuid) to authenticated;

create policy "room members see session signal" on public.game_sessions for select to authenticated using (public.can_access_session(id));
create policy "room members see roster" on public.game_players for select to authenticated using (public.can_access_session(session_id));
-- session questions, keys, and answers intentionally have no client SELECT policies.

create view public.quiz_summaries with (security_invoker = true) as
select q.*, count(questions.id)::integer as question_count
from public.quizzes q left join public.questions on questions.quiz_id = q.id
group by q.id;
grant select on public.quiz_summaries to authenticated;

create or replace function public.is_host_account() returns boolean
language sql stable set search_path = '' as $$
  select auth.uid() is not null and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

create or replace function public.normalize_typed_answer(p_value text) returns text
language sql immutable set search_path = '' as $$
  select lower(regexp_replace(trim(normalize(coalesce(p_value, ''), NFKC)), '\s+', ' ', 'g'));
$$;

create or replace function public.assert_rate_limit(p_action text, p_limit integer, p_window interval) returns void
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select count(*) into v_count from public.action_rate_limits
   where actor_id = auth.uid() and action = p_action and created_at > now() - p_window;
  if v_count >= p_limit then raise exception 'Too many requests. Please wait and try again.' using errcode = 'P0001'; end if;
  insert into public.action_rate_limits(actor_id, action) values (auth.uid(), p_action);
end;
$$;

create or replace function public.validate_quiz_payload(p_quiz jsonb) returns text[]
language plpgsql stable set search_path = '' as $$
declare v_errors text[] := array[]::text[]; v_question jsonb; v_index integer := 0; v_kind text; v_options integer; v_correct integer;
begin
  if length(trim(coalesce(p_quiz->>'title', ''))) = 0 then v_errors := array_append(v_errors, 'Quiz title is required'); end if;
  if jsonb_array_length(coalesce(p_quiz->'questions', '[]')) = 0 then v_errors := array_append(v_errors, 'Add at least one question'); end if;
  for v_question in select value from jsonb_array_elements(coalesce(p_quiz->'questions', '[]')) loop
    v_index := v_index + 1; v_kind := v_question->>'kind'; v_options := jsonb_array_length(coalesce(v_question->'options', '[]'));
    select count(*) into v_correct from jsonb_array_elements(coalesce(v_question->'options', '[]')) o where coalesce((o->>'isCorrect')::boolean, false);
    if length(trim(coalesce(v_question->>'prompt', ''))) = 0 then v_errors := array_append(v_errors, format('Question %s: prompt is required', v_index)); end if;
    if v_kind in ('single','true_false','multiple','poll') and (v_options < 2 or v_options > 4) then v_errors := array_append(v_errors, format('Question %s: choose 2–4 options', v_index)); end if;
    if v_kind in ('single','true_false') and v_correct <> 1 then v_errors := array_append(v_errors, format('Question %s: choose exactly one correct answer', v_index)); end if;
    if v_kind = 'multiple' and v_correct < 1 then v_errors := array_append(v_errors, format('Question %s: choose at least one correct answer', v_index)); end if;
    if v_kind = 'typed' and jsonb_array_length(coalesce(v_question->'accepted_answers', '[]')) = 0 then v_errors := array_append(v_errors, format('Question %s: add an accepted answer', v_index)); end if;
  end loop;
  return v_errors;
end;
$$;

create or replace function public.save_quiz(p_quiz jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_question jsonb; v_errors text[];
begin
  if not public.is_host_account() then raise exception 'A host account is required'; end if;
  v_errors := public.validate_quiz_payload(p_quiz);
  if p_quiz->>'status' = 'published' and cardinality(v_errors) > 0 then raise exception '%', array_to_string(v_errors, ' · '); end if;
  v_id := nullif(p_quiz->>'id','')::uuid;
  if v_id is null then
    insert into public.quizzes(owner_id,title,description,cover_path,status,is_public)
    values(auth.uid(), trim(p_quiz->>'title'), coalesce(p_quiz->>'description',''), p_quiz->>'cover_path', (p_quiz->>'status')::public.quiz_status, coalesce((p_quiz->>'is_public')::boolean,false)) returning id into v_id;
  else
    update public.quizzes set title=trim(p_quiz->>'title'), description=coalesce(p_quiz->>'description',''), cover_path=p_quiz->>'cover_path', status=(p_quiz->>'status')::public.quiz_status, is_public=coalesce((p_quiz->>'is_public')::boolean,false)
     where id=v_id and owner_id=auth.uid();
    if not found then raise exception 'Quiz not found or access denied'; end if;
    delete from public.questions where quiz_id=v_id;
  end if;
  for v_question in select value from jsonb_array_elements(coalesce(p_quiz->'questions','[]')) loop
    insert into public.questions(quiz_id,position,kind,prompt,options,accepted_answers,explanation,image_path,time_limit,points_mode)
    values(v_id,(v_question->>'position')::integer,(v_question->>'kind')::public.question_kind,trim(v_question->>'prompt'),coalesce(v_question->'options','[]'),array(select jsonb_array_elements_text(coalesce(v_question->'accepted_answers','[]'))),coalesce(v_question->>'explanation',''),v_question->>'image_path',coalesce((v_question->>'time_limit')::integer,20),coalesce((v_question->>'points_mode')::public.points_mode,'standard'));
  end loop;
  return v_id;
end;
$$;

create or replace function public.get_owned_quiz(p_quiz_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('id',q.id,'title',q.title,'description',q.description,'cover_path',q.cover_path,'status',q.status,'is_public',q.is_public,'created_at',q.created_at,'updated_at',q.updated_at,
    'questions',coalesce((select jsonb_agg(to_jsonb(x) order by x.position) from public.questions x where x.quiz_id=q.id),'[]'::jsonb))
  from public.quizzes q where q.id=p_quiz_id and q.owner_id=auth.uid();
$$;

-- Strip correctness flags before any question content is shareable.
create or replace function public.make_public_options(p_options jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',o->>'id','text',o->>'text')),'[]'::jsonb) from jsonb_array_elements(coalesce(p_options,'[]')) o;
$$;

create or replace function public.get_public_quiz(p_quiz_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',q.id,'title',q.title,'description',q.description,'cover_path',q.cover_path,'status',q.status,'is_public',q.is_public,'created_at',q.created_at,'updated_at',q.updated_at,
    'questions',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'position',x.position,'kind',x.kind,'prompt',x.prompt,'options',public.make_public_options(x.options),'accepted_answers','[]'::jsonb,'explanation','','image_path',x.image_path,'time_limit',x.time_limit,'points_mode',x.points_mode) order by x.position) from public.questions x where x.quiz_id=q.id),'[]'::jsonb))
  from public.quizzes q where q.id=p_quiz_id and q.status='published' and q.is_public;
$$;

create or replace function public.copy_public_quiz(p_quiz_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_host_account() then raise exception 'A host account is required'; end if;
  insert into public.quizzes(owner_id,title,description,cover_path,status,is_public)
  select auth.uid(),left(title || ' (shared copy)',120),description,cover_path,'draft',false from public.quizzes where id=p_quiz_id and status='published' and is_public returning id into v_id;
  if v_id is null then raise exception 'Shared quiz not found'; end if;
  insert into public.questions(quiz_id,position,kind,prompt,options,accepted_answers,explanation,image_path,time_limit,points_mode)
  select v_id,position,kind,prompt,options,accepted_answers,explanation,image_path,time_limit,points_mode from public.questions where quiz_id=p_quiz_id;
  return v_id;
end;
$$;

create or replace function public.duplicate_quiz(p_quiz_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.quizzes(owner_id,title,description,cover_path,status,is_public)
  select auth.uid(),left(title || ' (copy)',120),description,cover_path,'draft',false from public.quizzes where id=p_quiz_id and owner_id=auth.uid() returning id into v_id;
  if v_id is null then raise exception 'Quiz not found or access denied'; end if;
  insert into public.questions(quiz_id,position,kind,prompt,options,accepted_answers,explanation,image_path,time_limit,points_mode)
  select v_id,position,kind,prompt,options,accepted_answers,explanation,image_path,time_limit,points_mode from public.questions where quiz_id=p_quiz_id;
  return v_id;
end;
$$;

create or replace function public.make_public_options(p_options jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',o->>'id','text',o->>'text')),'[]'::jsonb) from jsonb_array_elements(coalesce(p_options,'[]')) o;
$$;

create or replace function public.option_keys(p_options jsonb) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(o->>'id' order by o->>'id') filter(where coalesce((o->>'isCorrect')::boolean,false)),'{}') from jsonb_array_elements(coalesce(p_options,'[]')) o;
$$;

create or replace function public.create_game(p_quiz_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_quiz public.quizzes%rowtype; v_session uuid; v_pin text; v_question public.questions%rowtype; v_snapshot_question uuid; v_tries integer := 0;
begin
  if not public.is_host_account() then raise exception 'A host account is required'; end if;
  select * into v_quiz from public.quizzes where id=p_quiz_id and owner_id=auth.uid() and status='published';
  if not found then raise exception 'Publish this quiz before hosting it'; end if;
  loop
    v_pin := lpad((floor(random()*900000)+100000)::integer::text,6,'0');
    exit when not exists(select 1 from public.game_sessions where pin=v_pin);
    v_tries := v_tries+1; if v_tries>20 then raise exception 'Could not allocate a game PIN'; end if;
  end loop;
  insert into public.game_sessions(host_id,quiz_id,quiz_title,pin) values(auth.uid(),p_quiz_id,v_quiz.title,v_pin) returning id into v_session;
  for v_question in select * from public.questions where quiz_id=p_quiz_id order by position loop
    insert into public.session_questions(session_id,source_question_id,position,kind,prompt,public_options,explanation,image_path,time_limit,points_mode)
    values(v_session,v_question.id,v_question.position,v_question.kind,v_question.prompt,public.make_public_options(v_question.options),v_question.explanation,v_question.image_path,v_question.time_limit,v_question.points_mode) returning id into v_snapshot_question;
    insert into public.session_answer_keys(question_id,correct_option_ids,accepted_answers) values(v_snapshot_question,public.option_keys(v_question.options),v_question.accepted_answers);
  end loop;
  return jsonb_build_object('sessionId',v_session,'pin',v_pin);
end;
$$;

create or replace function public.join_game(p_pin text, p_nickname text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_session public.game_sessions%rowtype; v_player uuid;
begin
  if auth.uid() is null then raise exception 'Anonymous authentication is required'; end if;
  perform public.assert_rate_limit('join_game',10,interval '1 minute');
  if length(trim(p_nickname)) not between 2 and 24 then raise exception 'Nickname must be 2–24 characters'; end if;
  select * into v_session from public.game_sessions where pin=p_pin and phase='lobby' and not locked and expires_at>now() for update;
  if not found then raise exception 'Game PIN is invalid, locked, started, or expired'; end if;
  if (select count(*) from public.game_players where session_id=v_session.id and not removed)>=50 then raise exception 'This room has reached its 50-player target'; end if;
  insert into public.game_players(session_id,auth_user_id,nickname) values(v_session.id,auth.uid(),trim(p_nickname))
    on conflict(session_id,auth_user_id) do update set last_seen=now(), removed=false returning id into v_player;
  update public.game_sessions set state_version=state_version+1 where id=v_session.id;
  return jsonb_build_object('sessionId',v_session.id,'playerId',v_player);
exception when unique_violation then raise exception 'That nickname is already in this room. Choose another.';
end;
$$;

create or replace function public.game_heartbeat(p_session_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.game_sessions set host_last_seen=now() where id=p_session_id and host_id=auth.uid();
  if found then return; end if;
  update public.game_players set last_seen=now() where session_id=p_session_id and auth_user_id=auth.uid() and not removed;
  if not found then raise exception 'Room access denied'; end if;
end;
$$;

create or replace function public.sync_game_phase(p_session_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_session public.game_sessions%rowtype; v_time integer;
begin
  select * into v_session from public.game_sessions where id=p_session_id for update;
  if v_session.phase='countdown' and v_session.phase_ends_at<=now() then
    select time_limit into v_time from public.session_questions where session_id=p_session_id and position=v_session.current_question_index;
    update public.game_sessions set phase='question_open',phase_started_at=now(),phase_ends_at=now()+make_interval(secs=>v_time),state_version=state_version+1 where id=p_session_id;
  elsif v_session.phase='question_open' and v_session.phase_ends_at<=now() then
    update public.game_sessions set phase='reveal',phase_ends_at=null,state_version=state_version+1 where id=p_session_id;
  end if;
end;
$$;

create or replace function public.get_game_state(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_session public.game_sessions%rowtype; v_question public.session_questions%rowtype; v_player public.game_players%rowtype; v_is_host boolean; v_total integer; v_players jsonb; v_own jsonb; v_reveal jsonb; v_leaders jsonb;
begin
  v_is_host := exists(select 1 from public.game_sessions where id=p_session_id and host_id=auth.uid());
  select * into v_player from public.game_players where session_id=p_session_id and auth_user_id=auth.uid() and not removed;
  if not v_is_host and v_player.id is null then raise exception 'Room access denied or player was removed'; end if;
  -- All live-game code locks the session before a player row. This fixed order
  -- prevents a polling state read and a simultaneous answer from deadlocking.
  perform public.sync_game_phase(p_session_id);
  if not v_is_host then
    update public.game_sessions set phase='ended',ended_at=coalesce(ended_at,now()),state_version=state_version+1 where id=p_session_id and phase not in ('ended','final') and host_last_seen < now()-interval '10 minutes';
  end if;
  select * into v_session from public.game_sessions where id=p_session_id;
  select count(*) into v_total from public.session_questions where session_id=p_session_id;
  select * into v_question from public.session_questions where session_id=p_session_id and position=v_session.current_question_index;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nickname',p.nickname::text,'score',p.score,'streak',p.streak,'connected',p.last_seen>now()-interval '45 seconds') order by p.joined_at),'[]') into v_players from public.game_players p where p.session_id=p_session_id and not p.removed;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nickname',p.nickname::text,'score',p.score,'streak',p.streak) order by p.score desc,p.nickname asc),'[]') into v_leaders from public.game_players p where p.session_id=p_session_id and not p.removed;
  if v_player.id is not null and v_question.id is not null then
    select jsonb_build_object('answer',a.answer,'correct',case when v_session.phase in ('reveal','leaderboard','final','ended') then a.is_correct else null end,'points',case when v_session.phase in ('reveal','leaderboard','final','ended') then a.points else null end) into v_own from public.game_answers a where a.question_id=v_question.id and a.player_id=v_player.id;
  end if;
  if v_question.id is not null and v_session.phase in ('reveal','leaderboard','final','ended') then
    select jsonb_build_object('correctOptionIds',k.correct_option_ids,'acceptedAnswers',k.accepted_answers,'explanation',v_question.explanation,
      'distribution',coalesce((select jsonb_object_agg(label,total) from (select answer::text label,count(*) total from public.game_answers where question_id=v_question.id group by answer::text)d),'{}'::jsonb))
    into v_reveal from public.session_answer_keys k where k.question_id=v_question.id;
  end if;
  return jsonb_build_object('sessionId',v_session.id,'pin',v_session.pin,'phase',v_session.phase,'locked',v_session.locked,
    'currentQuestionIndex',v_session.current_question_index,'totalQuestions',v_total,'phaseStartedAt',v_session.phase_started_at,'phaseEndsAt',v_session.phase_ends_at,'quizTitle',v_session.quiz_title,
    'question',case when v_question.id is null then null else jsonb_build_object('id',v_question.id,'prompt',v_question.prompt,'kind',v_question.kind,'options',v_question.public_options,'imagePath',v_question.image_path,'timeLimit',v_question.time_limit,'pointsMode',v_question.points_mode,'position',v_question.position) end,
    'players',v_players,'submittedCount',case when v_question.id is null then 0 else (select count(*) from public.game_answers where question_id=v_question.id) end,
    'ownSubmission',v_own,'reveal',v_reveal,'leaderboard',v_leaders,'isHost',v_is_host,'hostDisconnected',not v_is_host and v_session.host_last_seen<now()-interval '45 seconds');
end;
$$;

create or replace function public.host_game_action(p_session_id uuid,p_action text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_session public.game_sessions%rowtype; v_total integer;
begin
  select * into v_session from public.game_sessions where id=p_session_id and host_id=auth.uid() for update;
  if not found then raise exception 'Only the room host can do that'; end if;
  select count(*) into v_total from public.session_questions where session_id=p_session_id;
  if p_action='lock' then update public.game_sessions set locked=true,state_version=state_version+1 where id=p_session_id;
  elsif p_action='unlock' and v_session.phase='lobby' then update public.game_sessions set locked=false,state_version=state_version+1 where id=p_session_id;
  elsif p_action='start' and v_session.phase='lobby' then
    if not exists(select 1 from public.game_players where session_id=p_session_id and not removed) then raise exception 'At least one player is required'; end if;
    update public.game_sessions set locked=true,current_question_index=0,phase='countdown',phase_started_at=now(),phase_ends_at=now()+interval '4 seconds',state_version=state_version+1 where id=p_session_id;
  elsif p_action='reveal' and v_session.phase='question_open' then update public.game_sessions set phase='reveal',phase_ends_at=null,state_version=state_version+1 where id=p_session_id;
  elsif p_action='leaderboard' and v_session.phase='reveal' then update public.game_sessions set phase='leaderboard',state_version=state_version+1 where id=p_session_id;
  elsif p_action='next' and v_session.phase='leaderboard' and v_session.current_question_index+1<v_total then update public.game_sessions set current_question_index=current_question_index+1,phase='countdown',phase_started_at=now(),phase_ends_at=now()+interval '4 seconds',state_version=state_version+1 where id=p_session_id;
  elsif p_action='finish' and v_session.phase='leaderboard' then update public.game_sessions set phase='final',phase_ends_at=null,state_version=state_version+1 where id=p_session_id;
  elsif p_action='end' then update public.game_sessions set phase='ended',ended_at=coalesce(ended_at,now()),phase_ends_at=null,state_version=state_version+1 where id=p_session_id;
  elsif p_action='replay' and v_session.phase in ('final','ended') then
    delete from public.game_answers where session_id=p_session_id; update public.game_players set score=0,streak=0 where session_id=p_session_id;
    update public.game_sessions set phase='countdown',current_question_index=0,ended_at=null,phase_started_at=now(),phase_ends_at=now()+interval '4 seconds',state_version=state_version+1 where id=p_session_id;
  end if;
  return jsonb_build_object('ok',true);
end;
$$;

create or replace function public.remove_game_player(p_session_id uuid,p_player_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.game_sessions where id=p_session_id and host_id=auth.uid() for update;
  if not found then raise exception 'Only the room host can remove players'; end if;
  update public.game_players set removed=true where id=p_player_id and session_id=p_session_id;
  update public.game_sessions set state_version=state_version+1 where id=p_session_id;
end;
$$;

create or replace function public.answer_is_correct(p_kind public.question_kind,p_answer jsonb,p_correct text[],p_accepted text[]) returns boolean
language plpgsql immutable set search_path = '' as $$
declare v_given text[];
begin
  if p_kind='poll' then return true; end if;
  if p_kind='typed' then return public.normalize_typed_answer(p_answer#>>'{}')=any(select public.normalize_typed_answer(x) from unnest(p_accepted)x); end if;
  if jsonb_typeof(p_answer)='array' then select coalesce(array_agg(value order by value),'{}') into v_given from jsonb_array_elements_text(p_answer); else v_given:=array[p_answer#>>'{}']; end if;
  return v_given=(select coalesce(array_agg(x order by x),'{}') from unnest(p_correct)x);
end;
$$;

create or replace function public.score_answer(p_correct boolean,p_response_ms integer,p_time_limit integer,p_mode public.points_mode) returns integer
language sql immutable set search_path = '' as $$
  select case when not p_correct or p_mode='none' then 0 else round((case when p_mode='double' then 2000 else 1000 end)*(0.5+0.5*greatest(0,least(1,1-p_response_ms::numeric/greatest(1,p_time_limit*1000)))))::integer end;
$$;

create or replace function public.submit_game_answer(p_session_id uuid,p_question_id uuid,p_answer jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_session public.game_sessions%rowtype; v_question public.session_questions%rowtype; v_player public.game_players%rowtype; v_key public.session_answer_keys%rowtype; v_response integer; v_correct boolean; v_points integer;
begin
  perform public.assert_rate_limit('submit_game_answer',30,interval '1 minute');
  if pg_column_size(p_answer)>2048 then raise exception 'Answer is too large'; end if;
  select * into v_session from public.game_sessions where id=p_session_id for update;
  select * into v_player from public.game_players where session_id=p_session_id and auth_user_id=auth.uid() and not removed;
  if v_player.id is null then raise exception 'Player session is invalid'; end if;
  select * into v_question from public.session_questions where id=p_question_id and session_id=p_session_id and position=v_session.current_question_index;
  if v_question.id is null or v_session.phase<>'question_open' or v_session.phase_ends_at<now() then raise exception 'Answers are closed'; end if;
  if exists(select 1 from public.game_answers where question_id=p_question_id and player_id=v_player.id) then raise exception 'Your final answer was already submitted'; end if;
  select * into v_key from public.session_answer_keys where question_id=p_question_id;
  v_response:=greatest(0,(extract(epoch from(now()-v_session.phase_started_at))*1000)::integer);
  v_correct:=public.answer_is_correct(v_question.kind,p_answer,v_key.correct_option_ids,v_key.accepted_answers);
  v_points:=public.score_answer(v_correct,v_response,v_question.time_limit,v_question.points_mode);
  insert into public.game_answers(session_id,question_id,player_id,answer,response_ms,is_correct,points) values(p_session_id,p_question_id,v_player.id,p_answer,v_response,v_correct,v_points);
  update public.game_players set score=score+v_points,streak=case when v_question.kind='poll' then streak when v_correct then streak+1 else 0 end,last_seen=now() where id=v_player.id;
  update public.game_sessions set state_version=state_version+1 where id=p_session_id;
  return jsonb_build_object('accepted',true);
end;
$$;

create or replace function public.list_host_sessions() returns table(id uuid,pin text,quiz_title text,phase public.game_phase,created_at timestamptz,ended_at timestamptz,player_count bigint)
language sql security definer set search_path = '' as $$
  select s.id,s.pin,s.quiz_title,s.phase,s.created_at,s.ended_at,count(p.id) from public.game_sessions s left join public.game_players p on p.session_id=s.id and not p.removed where s.host_id=auth.uid() group by s.id order by s.created_at desc;
$$;

-- Self-paced assignments use their own immutable quiz snapshot.
create or replace function public.create_assignment(p_quiz_id uuid,p_title text,p_deadline timestamptz default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_quiz public.quizzes%rowtype; v_assignment uuid;
begin
  select * into v_quiz from public.quizzes where id=p_quiz_id and owner_id=auth.uid() and status='published';
  if not found then raise exception 'Publish this quiz before assigning it'; end if;
  if p_deadline is not null and p_deadline<=now() then raise exception 'Deadline must be in the future'; end if;
  insert into public.assignments(host_id,quiz_id,quiz_title,title,deadline) values(auth.uid(),p_quiz_id,v_quiz.title,left(trim(p_title),120),p_deadline) returning id into v_assignment;
  insert into public.assignment_questions(assignment_id,position,kind,prompt,public_options,explanation,image_path,time_limit,points_mode,correct_option_ids,accepted_answers)
  select v_assignment,position,kind,prompt,public.make_public_options(options),explanation,image_path,time_limit,points_mode,public.option_keys(options),accepted_answers from public.questions where quiz_id=p_quiz_id;
  return jsonb_build_object('id',v_assignment);
end;
$$;

create or replace function public.list_host_assignments() returns table(id uuid,title text,quiz_title text,deadline timestamptz,created_at timestamptz,completed_count bigint)
language sql security definer set search_path = '' as $$
  select a.id,a.title,a.quiz_title,a.deadline,a.created_at,count(p.id) filter(where p.completed_at is not null) from public.assignments a left join public.practice_attempts p on p.assignment_id=a.id where a.host_id=auth.uid() group by a.id order by a.created_at desc;
$$;

create or replace function public.join_assignment(p_assignment_id uuid,p_nickname text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_attempt uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if; perform public.assert_rate_limit('join_assignment',10,interval '1 minute');
  perform 1 from public.assignments where id=p_assignment_id and (deadline is null or deadline>now());
  if not found then raise exception 'Assignment link is invalid or the deadline has passed'; end if;
  if length(trim(p_nickname)) not between 2 and 24 then raise exception 'Nickname must be 2–24 characters'; end if;
  insert into public.practice_attempts(assignment_id,auth_user_id,nickname) values(p_assignment_id,auth.uid(),trim(p_nickname)) returning id into v_attempt;
  return jsonb_build_object('attemptId',v_attempt);
end;
$$;

create or replace function public.get_practice_state(p_attempt_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_attempt public.practice_attempts%rowtype; v_assignment public.assignments%rowtype; v_question public.assignment_questions%rowtype; v_total integer; v_review jsonb;
begin
  select * into v_attempt from public.practice_attempts where id=p_attempt_id and auth_user_id=auth.uid(); if not found then raise exception 'Attempt not found'; end if;
  select * into v_assignment from public.assignments where id=v_attempt.assignment_id;
  if v_attempt.completed_at is null and v_assignment.deadline is not null and v_assignment.deadline<=now() then raise exception 'The assignment deadline has passed'; end if;
  select count(*) into v_total from public.assignment_questions where assignment_id=v_assignment.id;
  select * into v_question from public.assignment_questions where assignment_id=v_assignment.id and position=v_attempt.current_index;
  if v_attempt.completed_at is not null then
    select coalesce(jsonb_agg(jsonb_build_object('questionId',q.id,'prompt',q.prompt,'correct',a.is_correct,'points',a.points,'answer',a.answer,'explanation',q.explanation) order by q.position),'[]') into v_review from public.assignment_questions q join public.practice_answers a on a.question_id=q.id and a.attempt_id=v_attempt.id;
  end if;
  return jsonb_build_object('attemptId',v_attempt.id,'assignmentTitle',v_assignment.title,'nickname',v_attempt.nickname,'currentIndex',v_attempt.current_index,'totalQuestions',v_total,'score',v_attempt.score,'completed',v_attempt.completed_at is not null,'correctCount',(select count(*) from public.practice_answers where attempt_id=v_attempt.id and is_correct),'review',v_review,
    'question',case when v_question.id is null or v_attempt.completed_at is not null then null else jsonb_build_object('id',v_question.id,'prompt',v_question.prompt,'kind',v_question.kind,'options',v_question.public_options,'imagePath',v_question.image_path,'timeLimit',v_question.time_limit,'pointsMode',v_question.points_mode,'position',v_question.position) end);
end;
$$;

create or replace function public.submit_practice_answer(p_attempt_id uuid,p_question_id uuid,p_answer jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_attempt public.practice_attempts%rowtype; v_assignment public.assignments%rowtype; v_question public.assignment_questions%rowtype; v_response integer; v_correct boolean; v_points integer; v_total integer;
begin
  perform public.assert_rate_limit('submit_practice_answer',30,interval '1 minute');
  select * into v_attempt from public.practice_attempts where id=p_attempt_id and auth_user_id=auth.uid() and completed_at is null for update; if not found then raise exception 'Attempt is complete or unavailable'; end if;
  select * into v_assignment from public.assignments where id=v_attempt.assignment_id; if v_assignment.deadline is not null and v_assignment.deadline<=now() then raise exception 'The assignment deadline has passed'; end if;
  select * into v_question from public.assignment_questions where id=p_question_id and assignment_id=v_attempt.assignment_id and position=v_attempt.current_index; if not found then raise exception 'This is not the current question'; end if;
  v_response:=greatest(0,(extract(epoch from(now()-v_attempt.question_started_at))*1000)::integer); v_correct:=public.answer_is_correct(v_question.kind,p_answer,v_question.correct_option_ids,v_question.accepted_answers); v_points:=public.score_answer(v_correct,v_response,v_question.time_limit,v_question.points_mode);
  insert into public.practice_answers(attempt_id,question_id,answer,response_ms,is_correct,points) values(v_attempt.id,v_question.id,p_answer,v_response,v_correct,v_points);
  select count(*) into v_total from public.assignment_questions where assignment_id=v_attempt.assignment_id;
  update public.practice_attempts set score=score+v_points,current_index=current_index+1,question_started_at=now(),completed_at=case when current_index+1>=v_total then now() else null end where id=v_attempt.id;
  return public.get_practice_state(v_attempt.id);
exception when unique_violation then raise exception 'This question was already answered';
end;
$$;

create or replace function public.get_session_report(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if not exists(select 1 from public.game_sessions where id=p_session_id and host_id=auth.uid()) then raise exception 'Report access denied'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('playerId',p.id,'nickname',p.nickname::text,'score',p.score,
    'accuracy',coalesce((select round(100.0*count(*) filter(where a.is_correct and q.kind<>'poll')/nullif(count(*) filter(where q.kind<>'poll'),0)) from public.game_answers a join public.session_questions q on q.id=a.question_id where a.player_id=p.id),0),
    'averageResponseMs',coalesce((select round(avg(a.response_ms)) from public.game_answers a where a.player_id=p.id),0),
    'answers',coalesce((select jsonb_agg(jsonb_build_object('question',q.prompt,'answer',a.answer,'correct',a.is_correct,'points',a.points,'responseMs',a.response_ms) order by q.position) from public.game_answers a join public.session_questions q on q.id=a.question_id where a.player_id=p.id),'[]'::jsonb)) order by p.score desc),'[]') into v_result
  from public.game_players p where p.session_id=p_session_id and not p.removed;
  return v_result;
end;
$$;

create or replace function public.get_assignment_report(p_assignment_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if not exists(select 1 from public.assignments where id=p_assignment_id and host_id=auth.uid()) then raise exception 'Report access denied'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('playerId',p.id,'nickname',p.nickname,'score',p.score,
    'accuracy',coalesce((select round(100.0*count(*) filter(where a.is_correct and q.kind<>'poll')/nullif(count(*) filter(where q.kind<>'poll'),0)) from public.practice_answers a join public.assignment_questions q on q.id=a.question_id where a.attempt_id=p.id),0),
    'averageResponseMs',coalesce((select round(avg(a.response_ms)) from public.practice_answers a where a.attempt_id=p.id),0),
    'answers',coalesce((select jsonb_agg(jsonb_build_object('question',q.prompt,'answer',a.answer,'correct',a.is_correct,'points',a.points,'responseMs',a.response_ms) order by q.position) from public.practice_answers a join public.assignment_questions q on q.id=a.question_id where a.attempt_id=p.id),'[]'::jsonb)) order by p.score desc),'[]') into v_result
  from public.practice_attempts p where p.assignment_id=p_assignment_id;
  return v_result;
end;
$$;

create or replace function public.delete_session_report(p_session_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin delete from public.game_sessions where id=p_session_id and host_id=auth.uid(); if not found then raise exception 'Report not found or access denied'; end if; end;
$$;

-- Explicit grants: clients use narrow RPCs. Tables containing keys/answers stay inaccessible.
revoke all on all tables in schema public from anon;
revoke all on public.session_questions,public.session_answer_keys,public.game_answers,public.assignment_questions,public.practice_answers,public.action_rate_limits from authenticated;
revoke execute on all functions in schema public from public,anon,authenticated;
grant select,insert,update,delete on public.quizzes,public.questions to authenticated;
grant select on public.game_sessions,public.game_players to authenticated;
grant execute on function public.can_access_session(uuid),public.save_quiz(jsonb),public.get_owned_quiz(uuid),public.copy_public_quiz(uuid),public.duplicate_quiz(uuid),public.create_game(uuid),public.join_game(text,text),public.get_game_state(uuid),public.host_game_action(uuid,text),public.remove_game_player(uuid,uuid),public.submit_game_answer(uuid,uuid,jsonb),public.game_heartbeat(uuid),public.list_host_sessions(),public.create_assignment(uuid,text,timestamptz),public.list_host_assignments(),public.join_assignment(uuid,text),public.get_practice_state(uuid),public.submit_practice_answer(uuid,uuid,jsonb),public.get_session_report(uuid),public.get_assignment_report(uuid),public.delete_session_report(uuid) to authenticated;
grant execute on function public.get_public_quiz(uuid) to anon,authenticated;

alter table public.game_sessions replica identity full;
alter table public.game_players replica identity full;
alter publication supabase_realtime add table public.game_sessions,public.game_players;

-- Public image reads; writes are owner-folder-scoped. Filenames are UUIDs generated client-side.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('quiz-images','quiz-images',true,5242880,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "public quiz image reads" on storage.objects for select to public using (bucket_id='quiz-images');
create policy "hosts upload own images" on storage.objects for insert to authenticated with check (bucket_id='quiz-images' and (storage.foldername(name))[1]=auth.uid()::text and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy "hosts manage own images" on storage.objects for update to authenticated using (bucket_id='quiz-images' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='quiz-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "hosts delete own images" on storage.objects for delete to authenticated using (bucket_id='quiz-images' and (storage.foldername(name))[1]=auth.uid()::text);

-- Suggested daily cleanup (enable pg_cron manually if available on your plan):
-- delete anonymous auth users older than 30 days and rate events older than one day.
create or replace function public.cleanup_expired_toohak_data() returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.game_sessions where expires_at<now()-interval '7 days';
  delete from public.action_rate_limits where created_at<now()-interval '1 day';
  delete from auth.users where is_anonymous and created_at<now()-interval '30 days';
end;
$$;
revoke execute on function public.cleanup_expired_toohak_data() from public,anon,authenticated;

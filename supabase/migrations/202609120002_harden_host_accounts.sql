begin;

-- Keep extensions outside the API-exposed public schema.
create schema if not exists extensions;
alter extension citext set schema extensions;

-- Anonymous Auth users have the authenticated Postgres role, so host-owned
-- resources must also check the JWT's is_anonymous claim.
drop policy if exists "hosts own quizzes" on public.quizzes;
create policy "hosts own quizzes" on public.quizzes
  for all to authenticated
  using (
    owner_id = auth.uid()
    and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
  )
  with check (
    owner_id = auth.uid()
    and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
  );

drop policy if exists "hosts own questions" on public.questions;
create policy "hosts own questions" on public.questions
  for all to authenticated
  using (
    not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
    and exists (
      select 1
      from public.quizzes q
      where q.id = quiz_id and q.owner_id = auth.uid()
    )
  )
  with check (
    not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
    and exists (
      select 1
      from public.quizzes q
      where q.id = quiz_id and q.owner_id = auth.uid()
    )
  );

drop policy if exists "hosts manage own images" on storage.objects;
create policy "hosts manage own images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'quiz-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
  )
  with check (
    bucket_id = 'quiz-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
  );

drop policy if exists "hosts delete own images" on storage.objects;
create policy "hosts delete own images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'quiz-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
  );

commit;

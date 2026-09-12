import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDirectory = resolve('supabase/migrations')
const schema = readdirSync(migrationsDirectory)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => readFileSync(resolve(migrationsDirectory, file), 'utf8'))
  .join('\n')

describe('backend security contract', () => {
  it('enables RLS on every player, host, and secret data table', () => {
    for (const table of ['quizzes', 'questions', 'game_sessions', 'session_questions', 'session_answer_keys', 'game_players', 'game_answers', 'assignments', 'assignment_questions', 'practice_attempts', 'practice_answers']) {
      expect(schema).toContain(`alter table public.${table} enable row level security`)
    }
  })
  it('keeps snapshots and answer keys separate and revokes direct key access', () => {
    expect(schema).toContain('create table public.session_answer_keys')
    expect(schema).toMatch(/revoke all on public\.session_questions,public\.session_answer_keys,public\.game_answers/)
    expect(schema).not.toMatch(/grant select on public\.session_answer_keys/)
  })
  it('keeps anonymous player identities out of host-owned direct-write policies', () => {
    expect(schema).toContain('alter extension citext set schema extensions')
    expect(schema).toMatch(/create policy "hosts own quizzes"[\s\S]*?is_anonymous/)
    expect(schema).toMatch(/create policy "hosts own questions"[\s\S]*?is_anonymous/)
    expect(schema).toMatch(/create policy "hosts manage own images"[\s\S]*?is_anonymous/)
    expect(schema).toMatch(/create policy "hosts delete own images"[\s\S]*?is_anonymous/)
  })

  it('implements authoritative duplicate, late, phase, host, PIN, deadline, and reconnection controls', () => {
    for (const fragment of [
      'unique (question_id, player_id)', "v_session.phase<>'question_open'", 'v_session.phase_ends_at<now()',
      'Only the room host can do that', "pin=p_pin and phase='lobby' and not locked and expires_at>now()",
      'deadline is null or deadline>now()', "host_last_seen < now()-interval '10 minutes'", 'on conflict(session_id,auth_user_id)',
    ]) expect(schema).toContain(fragment)
  })
  it('uses only server time for scoring and deadlines', () => {
    expect(schema).toContain("extract(epoch from(now()-v_session.phase_started_at))")
    expect(schema).toContain('score_answer(v_correct,v_response')
    expect(schema).not.toContain('client_timestamp')
  })
})

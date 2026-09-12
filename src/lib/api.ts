import type { AssignmentSummary, GameState, Quiz, QuizSummary, ReportRow, SessionSummary } from './types'
import { supabase } from './supabase'

const db = supabase as any

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  if (data == null) throw new Error('The server returned no data.')
  return data
}

function quizPayload(quiz: Quiz) {
  return {
    id: quiz.id ?? null,
    title: quiz.title.trim(), description: quiz.description.trim(), cover_path: quiz.coverPath ?? null,
    status: quiz.status, is_public: quiz.isPublic,
    questions: quiz.questions.map((question, position) => ({
      id: question.id ?? null, prompt: question.prompt.trim(), kind: question.kind,
      options: question.options, accepted_answers: question.acceptedAnswers,
      explanation: question.explanation.trim(), image_path: question.imagePath ?? null,
      time_limit: question.timeLimit, points_mode: question.pointsMode, position,
    })),
  }
}

function mapQuiz(data: any): Quiz {
  return {
    id: data.id, title: data.title, description: data.description ?? '', coverPath: data.cover_path,
    status: data.status, isPublic: data.is_public, createdAt: data.created_at, updatedAt: data.updated_at,
    questions: (data.questions ?? []).sort((a: any, b: any) => a.position - b.position).map((question: any) => ({
      id: question.id, prompt: question.prompt, kind: question.kind, options: question.options ?? [],
      acceptedAnswers: question.accepted_answers ?? [], explanation: question.explanation ?? '',
      imagePath: question.image_path, timeLimit: question.time_limit, pointsMode: question.points_mode,
      position: question.position,
    })),
  }
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user
}

export async function ensurePlayerSession() {
  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData.session) return sessionData.session.user
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw new Error(`${error.message}. Anonymous sign-ins must be enabled in Supabase Auth.`)
  return data.user
}

export async function listQuizzes(): Promise<QuizSummary[]> {
  const { data, error } = await db.from('quiz_summaries').select('*').order('updated_at', { ascending: false })
  return unwrap(data, error)
}

export async function listSessions(): Promise<SessionSummary[]> {
  const { data, error } = await db.rpc('list_host_sessions')
  return unwrap(data, error)
}

export async function listAssignments(): Promise<AssignmentSummary[]> {
  const { data, error } = await db.rpc('list_host_assignments')
  return unwrap(data, error)
}

export async function getQuiz(id: string): Promise<Quiz> {
  const { data, error } = await db.rpc('get_owned_quiz', { p_quiz_id: id })
  return mapQuiz(unwrap(data, error))
}

export async function getPublicQuiz(id: string): Promise<Quiz> {
  const { data, error } = await db.rpc('get_public_quiz', { p_quiz_id: id })
  return mapQuiz(unwrap(data, error))
}

export async function copyPublicQuiz(id: string): Promise<string> {
  const { data, error } = await db.rpc('copy_public_quiz', { p_quiz_id: id })
  return unwrap(data, error)
}

export async function saveQuiz(quiz: Quiz): Promise<string> {
  const { data, error } = await db.rpc('save_quiz', { p_quiz: quizPayload(quiz) })
  return unwrap(data, error)
}

export async function duplicateQuiz(id: string): Promise<string> {
  const { data, error } = await db.rpc('duplicate_quiz', { p_quiz_id: id })
  return unwrap(data, error)
}

export async function deleteQuiz(id: string) {
  const { error } = await db.from('quizzes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function uploadQuizImage(file: File, ownerId: string): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Images must be 5 MB or smaller.')
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Use a PNG, JPEG, WebP, or GIF image.')
  const extension = file.name.split('.').pop()?.toLowerCase() || 'img'
  const path = `${ownerId}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('quiz-images').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error(error.message)
  return path
}

export async function createGame(quizId: string): Promise<{ sessionId: string; pin: string }> {
  const { data, error } = await db.rpc('create_game', { p_quiz_id: quizId })
  return unwrap(data, error)
}

export async function joinGame(pin: string, nickname: string): Promise<{ sessionId: string; playerId: string }> {
  await ensurePlayerSession()
  const { data, error } = await db.rpc('join_game', { p_pin: pin.replace(/\D/g, ''), p_nickname: nickname.trim() })
  return unwrap(data, error)
}

export async function getGameState(sessionId: string): Promise<GameState> {
  const { data, error } = await db.rpc('get_game_state', { p_session_id: sessionId })
  return unwrap(data, error)
}

export async function hostAction(sessionId: string, action: string) {
  const { data, error } = await db.rpc('host_game_action', { p_session_id: sessionId, p_action: action })
  return unwrap(data, error)
}

export async function removePlayer(sessionId: string, playerId: string) {
  const { error } = await db.rpc('remove_game_player', { p_session_id: sessionId, p_player_id: playerId })
  if (error) throw new Error(error.message)
}

export async function submitAnswer(sessionId: string, questionId: string, answer: unknown) {
  const { data, error } = await db.rpc('submit_game_answer', { p_session_id: sessionId, p_question_id: questionId, p_answer: answer })
  return unwrap(data, error)
}

export async function heartbeat(sessionId: string) {
  const { error } = await db.rpc('game_heartbeat', { p_session_id: sessionId })
  if (error) throw new Error(error.message)
}

export function watchGame(sessionId: string, refresh: () => void) {
  const channel = supabase.channel(`game:${sessionId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `session_id=eq.${sessionId}` }, refresh)
    .subscribe()
  return () => { void supabase.removeChannel(channel) }
}

export async function createAssignment(quizId: string, title: string, deadline: string | null) {
  const { data, error } = await db.rpc('create_assignment', { p_quiz_id: quizId, p_title: title, p_deadline: deadline || null })
  return unwrap<{ id: string }>(data, error)
}

export async function joinAssignment(assignmentId: string, nickname: string) {
  await ensurePlayerSession()
  const { data, error } = await db.rpc('join_assignment', { p_assignment_id: assignmentId, p_nickname: nickname.trim() })
  return unwrap<{ attemptId: string }>(data, error)
}

export async function getPracticeState(attemptId: string) {
  const { data, error } = await db.rpc('get_practice_state', { p_attempt_id: attemptId })
  return unwrap<any>(data, error)
}

export async function submitPracticeAnswer(attemptId: string, questionId: string, answer: unknown) {
  const { data, error } = await db.rpc('submit_practice_answer', { p_attempt_id: attemptId, p_question_id: questionId, p_answer: answer })
  return unwrap<any>(data, error)
}

export async function getSessionReport(sessionId: string): Promise<ReportRow[]> {
  const { data, error } = await db.rpc('get_session_report', { p_session_id: sessionId })
  return unwrap(data, error)
}

export async function getAssignmentReport(assignmentId: string): Promise<ReportRow[]> {
  const { data, error } = await db.rpc('get_assignment_report', { p_assignment_id: assignmentId })
  return unwrap(data, error)
}

export async function deleteSessionReport(sessionId: string) {
  const { error } = await db.rpc('delete_session_report', { p_session_id: sessionId })
  if (error) throw new Error(error.message)
}

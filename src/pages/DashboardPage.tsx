import { BarChart3, CalendarClock, Copy, FileQuestion, History, Play, Plus, Radio, Share2, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { EmptyState, ErrorBanner, Loading } from '../components/ui'
import { createAssignment, createGame, deleteQuiz, duplicateQuiz, listAssignments, listQuizzes, listSessions, saveQuiz } from '../lib/api'
import { exampleQuizzes } from '../lib/examples'
import { useHost } from '../lib/useHost'
import type { AssignmentSummary, QuizSummary, SessionSummary } from '../lib/types'

type Tab = 'quizzes' | 'sessions' | 'assignments'

export function DashboardPage() {
  const { user, loading: authLoading } = useHost()
  const [tab, setTab] = useState<Tab>('quizzes')
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([])
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const [quizData, sessionData, assignmentData] = await Promise.all([listQuizzes(), listSessions(), listAssignments()]); setQuizzes(quizData); setSessions(sessionData); setAssignments(assignmentData) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load your dashboard.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { if (user) void load() }, [user, load])
  if (authLoading) return <Layout><Loading /></Layout>
  if (!user) return <Navigate to="/auth" replace />

  async function act(key: string, action: () => Promise<void>) { setBusy(key); setError(''); try { await action(); await load() } catch (caught) { setError(caught instanceof Error ? caught.message : 'That action failed.') } finally { setBusy('') } }
  async function start(quiz: QuizSummary) { setBusy(quiz.id); try { const game = await createGame(quiz.id); navigate(`/host/${game.sessionId}`) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not start game.') } finally { setBusy('') } }
  async function assign(quiz: QuizSummary) {
    const deadline = window.prompt('Deadline (YYYY-MM-DD HH:MM), or leave blank for none:')
    if (deadline === null) return
    const iso = deadline.trim() ? new Date(deadline).toISOString() : null
    await act(`assign-${quiz.id}`, async () => { const result = await createAssignment(quiz.id, quiz.title, iso); await navigator.clipboard.writeText(`${location.origin}${location.pathname}#/practice/${result.id}`) })
  }
  async function addExamples() { await act('examples', async () => { for (const quiz of exampleQuizzes) await saveQuiz(quiz) }) }

  return <Layout wide>
    <header className="dashboard-heading"><div><span className="eyebrow">HOST WORKSPACE</span><h1>Ready for the next <em>aha!</em>?</h1><p>Create a quiz or pick up where you left off.</p></div><Link className="button button-primary" to="/quiz/new"><Plus /> Create quiz</Link></header>
    {error && <ErrorBanner message={error} onRetry={load} />}
    <div className="stats-grid"><article><span className="stat-icon"><FileQuestion /></span><div><strong>{quizzes.length}</strong><small>Total quizzes</small></div></article><article><span className="stat-icon"><Radio /></span><div><strong>{sessions.length}</strong><small>Sessions hosted</small></div></article><article><span className="stat-icon"><Users /></span><div><strong>{sessions.reduce((sum, item) => sum + Number(item.player_count || 0), 0)}</strong><small>Player joins</small></div></article></div>
    <div className="tabs" role="tablist"><button className={tab === 'quizzes' ? 'active' : ''} onClick={() => setTab('quizzes')}><FileQuestion /> My quizzes</button><button className={tab === 'sessions' ? 'active' : ''} onClick={() => setTab('sessions')}><History /> Game history</button><button className={tab === 'assignments' ? 'active' : ''} onClick={() => setTab('assignments')}><CalendarClock /> Assignments</button></div>
    {loading ? <Loading label="Loading your workspace…" /> : tab === 'quizzes' ? <section>
      {!quizzes.length ? <EmptyState icon={<FileQuestion />} title="Your quiz shelf is empty">Start from scratch or add two editable example quizzes, including one in Thai.<div className="button-row"><Link className="button button-primary" to="/quiz/new"><Plus /> Create quiz</Link><button className="button button-secondary" disabled={busy === 'examples'} onClick={addExamples}>Add examples</button></div></EmptyState>
      : <div className="quiz-grid">{quizzes.map((quiz) => <article className="quiz-card" key={quiz.id}><div className="quiz-cover"><span>{quiz.title.slice(0, 1).toUpperCase()}</span><small className={`status status-${quiz.status}`}>{quiz.status}</small></div><div className="quiz-body"><h3>{quiz.title}</h3><p>{quiz.description || 'No description yet.'}</p><div className="quiz-meta"><span><FileQuestion /> {quiz.question_count ?? 0} questions</span><span>{quiz.is_public ? 'Shareable' : 'Private'}</span></div><div className="card-actions"><Link className="button button-secondary" to={`/quiz/${quiz.id}/edit`}>Edit</Link><button className="button button-primary" disabled={quiz.status !== 'published' || busy === quiz.id} onClick={() => start(quiz)}><Play /> Host</button><button className="icon-button" aria-label={`Duplicate ${quiz.title}`} onClick={() => act(`copy-${quiz.id}`, async () => { await duplicateQuiz(quiz.id) })}><Copy /></button>{quiz.status === 'published' && quiz.is_public && <button className="icon-button" aria-label={`Copy share link for ${quiz.title}`} onClick={() => navigator.clipboard.writeText(`${location.origin}${location.pathname}#/shared/${quiz.id}`)}><Share2 /></button>}<button className="icon-button" aria-label={`Assign ${quiz.title}`} disabled={quiz.status !== 'published'} onClick={() => assign(quiz)}><CalendarClock /></button><button className="icon-button danger" aria-label={`Delete ${quiz.title}`} onClick={() => { if (confirm(`Delete “${quiz.title}”? This cannot be undone.`)) void act(`delete-${quiz.id}`, async () => deleteQuiz(quiz.id)) }}><Trash2 /></button></div></div></article>)}</div>}
    </section> : tab === 'sessions' ? <section>{!sessions.length ? <EmptyState icon={<History />} title="No games hosted yet">Publish a quiz and start a live session to see it here.</EmptyState> : <div className="data-list">{sessions.map((session) => <article key={session.id}><div><span className="status status-draft">PIN {session.pin}</span><h3>{session.quiz_title}</h3><p>{new Date(session.created_at).toLocaleString()} · {session.player_count} players</p></div><div className="button-row">{!session.ended_at && <Link className="button button-secondary" to={`/host/${session.id}`}><Radio /> Reopen</Link>}<Link className="button button-secondary" to={`/reports/session/${session.id}`}><BarChart3 /> Report</Link></div></article>)}</div>}</section>
      : <section>{!assignments.length ? <EmptyState icon={<CalendarClock />} title="No assignments yet">Use the calendar button on a published quiz to create a self-paced challenge.</EmptyState> : <div className="data-list">{assignments.map((assignment) => <article key={assignment.id}><div><h3>{assignment.title}</h3><p>{assignment.deadline ? `Due ${new Date(assignment.deadline).toLocaleString()}` : 'No deadline'} · {assignment.completed_count} completed</p></div><div className="button-row"><button className="button button-secondary" onClick={() => navigator.clipboard.writeText(`${location.origin}${location.pathname}#/practice/${assignment.id}`)}><Copy /> Copy link</button><Link className="button button-secondary" to={`/reports/assignment/${assignment.id}`}><BarChart3 /> Report</Link></div></article>)}</div>}</section>}
  </Layout>
}

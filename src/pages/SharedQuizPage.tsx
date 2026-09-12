import { ArrowLeft, ChevronLeft, ChevronRight, Copy, FileQuestion, LogIn } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { ErrorBanner, Loading, QuestionMedia } from '../components/ui'
import { copyPublicQuiz, getPublicQuiz } from '../lib/api'
import { useHost } from '../lib/useHost'
import type { Quiz } from '../lib/types'

export function SharedQuizPage() {
  const { quizId = '' } = useParams(); const { user } = useHost(); const navigate = useNavigate()
  const [quiz, setQuiz] = useState<Quiz | null>(null); const [index, setIndex] = useState(0); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { void getPublicQuiz(quizId).then(setQuiz).catch((caught) => setError(caught.message || 'This shared quiz is unavailable.')) }, [quizId])
  async function copy() { setBusy(true); try { const id = await copyPublicQuiz(quizId); navigate(`/quiz/${id}/edit`) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not copy this quiz.') } finally { setBusy(false) } }
  if (error && !quiz) return <Layout><ErrorBanner message={error} /><Link className="back-link" to="/"><ArrowLeft /> Home</Link></Layout>
  if (!quiz) return <Layout><Loading label="Opening shared quiz…" /></Layout>
  const question = quiz.questions[index]
  return <Layout><section className="shared-quiz"><span className="eyebrow">SHARED QUIZ</span><h1>{quiz.title}</h1><p>{quiz.description}</p><div className="quiz-meta"><span><FileQuestion /> {quiz.questions.length} questions</span><span>Published by a Toohak host</span></div>{error && <ErrorBanner message={error} />}<article className="shared-question"><span>Question {index + 1}</span><h2>{question.prompt}</h2><QuestionMedia path={question.imagePath} />{question.options.length > 0 && <ul>{question.options.map((option) => <li key={option.id}>{option.text}</li>)}</ul>}</article><div className="preview-controls"><button className="button button-secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}><ChevronLeft /> Previous</button><span>{index + 1} / {quiz.questions.length}</span><button className="button button-secondary" disabled={index === quiz.questions.length - 1} onClick={() => setIndex(index + 1)}>Next <ChevronRight /></button></div><hr />{user ? <button className="button button-primary button-large" disabled={busy} onClick={copy}><Copy /> {busy ? 'Copying…' : 'Copy to my quizzes'}</button> : <Link className="button button-primary button-large" to="/auth"><LogIn /> Sign in to copy this quiz</Link>}</section></Layout>
}

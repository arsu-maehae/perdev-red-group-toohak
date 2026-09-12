import { ArrowLeft, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { AnswerGrid, ErrorBanner, Loading, QuestionMedia } from '../components/ui'
import { getQuiz } from '../lib/api'
import { useHost } from '../lib/useHost'
import type { Quiz } from '../lib/types'

export function QuizPreviewPage() {
  const { quizId = '' } = useParams(); const { user, loading: authLoading } = useHost()
  const [quiz, setQuiz] = useState<Quiz | null>(null); const [index, setIndex] = useState(0); const [error, setError] = useState('')
  useEffect(() => { if (user) void getQuiz(quizId).then(setQuiz).catch((caught) => setError(caught.message)) }, [quizId, user])
  if (authLoading) return <Loading />
  if (!user) return <Navigate to="/auth" replace />
  if (error) return <Layout><ErrorBanner message={error} /></Layout>
  if (!quiz) return <Layout><Loading label="Preparing preview…" /></Layout>
  const question = quiz.questions[index]
  return <Layout wide><div className="preview-header"><Link to={`/quiz/${quizId}/edit`}><ArrowLeft /> Back to editor</Link><span>Preview · {index + 1} of {quiz.questions.length}</span></div><section className="game-stage preview-stage"><div className="question-kicker"><span>{quiz.title}</span><span><Clock3 /> {question.timeLimit}s · {question.pointsMode}</span></div><h1>{question.prompt}</h1><QuestionMedia path={question.imagePath} /><AnswerGrid question={{ ...question, id: question.id ?? String(index) }} value={null} disabled correctIds={question.options.filter((option) => option.isCorrect).map((option) => option.id)} onChange={() => undefined} /><div className="preview-controls"><button className="button button-secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}><ChevronLeft /> Previous</button><button className="button button-primary" disabled={index === quiz.questions.length - 1} onClick={() => setIndex(index + 1)}>Next <ChevronRight /></button></div></section></Layout>
}

import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, Eye, ImagePlus, Plus, Save, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ErrorBanner, Loading } from '../components/ui'
import { getQuiz, saveQuiz, uploadQuizImage } from '../lib/api'
import { makeBlankQuestion, makeBlankQuiz, validateQuiz } from '../lib/game'
import { publicAssetUrl } from '../lib/supabase'
import type { AnswerOption, Question, QuestionKind, Quiz } from '../lib/types'
import { useHost } from '../lib/useHost'

const kindLabels: Record<QuestionKind, string> = { single: 'Single answer', true_false: 'True / false', multiple: 'Multiple select', typed: 'Short typed answer', poll: 'Poll (unscored)' }

export function QuizEditorPage() {
  const { quizId } = useParams()
  const { user, loading: authLoading } = useHost()
  const [quiz, setQuiz] = useState<Quiz>(makeBlankQuiz())
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(Boolean(quizId))
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const errors = useMemo(() => validateQuiz(quiz), [quiz])

  useEffect(() => { if (quizId && user) void getQuiz(quizId).then((data) => { setQuiz(data); setLoading(false) }).catch((caught) => { setError(caught.message); setLoading(false) }) }, [quizId, user])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault() }
    addEventListener('beforeunload', warn); return () => removeEventListener('beforeunload', warn)
  }, [dirty])
  if (authLoading) return <Loading />
  if (!user) return <Navigate to="/auth" replace />
  if (loading) return <div className="editor-loading"><Loading label="Opening quiz…" /></div>
  const question = quiz.questions[selected]

  function changeQuiz(patch: Partial<Quiz>) { setQuiz((value) => ({ ...value, ...patch })); setDirty(true) }
  function changeQuestion(patch: Partial<Question>) {
    changeQuiz({ questions: quiz.questions.map((item, index) => index === selected ? { ...item, ...patch } : item) })
  }
  function setKind(kind: QuestionKind) {
    const patch: Partial<Question> = { kind, pointsMode: kind === 'poll' ? 'none' : question.pointsMode }
    if (kind === 'true_false') patch.options = [{ id: crypto.randomUUID(), text: 'True', isCorrect: true }, { id: crypto.randomUUID(), text: 'False', isCorrect: false }]
    else if (kind === 'typed') patch.options = []
    else if (!question.options.length) patch.options = [{ id: crypto.randomUUID(), text: '', isCorrect: true }, { id: crypto.randomUUID(), text: '', isCorrect: false }]
    changeQuestion(patch)
  }
  function changeOption(index: number, patch: Partial<AnswerOption>) { changeQuestion({ options: question.options.map((option, optionIndex) => optionIndex === index ? { ...option, ...patch } : option) }) }
  function toggleCorrect(index: number) {
    changeQuestion({ options: question.options.map((option, optionIndex) => ({ ...option, isCorrect: question.kind === 'multiple' ? optionIndex === index ? !option.isCorrect : option.isCorrect : optionIndex === index })) })
  }
  function addQuestion() { const questions = [...quiz.questions, makeBlankQuestion(quiz.questions.length)]; changeQuiz({ questions }); setSelected(questions.length - 1) }
  function duplicateQuestion() { const copy = { ...question, id: undefined, prompt: `${question.prompt} (copy)`, options: question.options.map((option) => ({ ...option, id: crypto.randomUUID() })) }; const questions = [...quiz.questions]; questions.splice(selected + 1, 0, copy); changeQuiz({ questions }); setSelected(selected + 1) }
  function removeQuestion() { if (quiz.questions.length === 1) return; const questions = quiz.questions.filter((_, index) => index !== selected); changeQuiz({ questions }); setSelected(Math.max(0, selected - 1)) }
  function moveQuestion(direction: -1 | 1) { const target = selected + direction; if (target < 0 || target >= quiz.questions.length) return; const questions = [...quiz.questions]; [questions[selected], questions[target]] = [questions[target], questions[selected]]; changeQuiz({ questions }); setSelected(target) }
  async function upload(event: ChangeEvent<HTMLInputElement>, target: 'cover' | 'question') {
    const file = event.target.files?.[0]; if (!file || !user) return
    setSaving(true); setError('')
    try { const path = await uploadQuizImage(file, user.id); if (target === 'cover') changeQuiz({ coverPath: path }); else changeQuestion({ imagePath: path }) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Upload failed.') } finally { setSaving(false) }
  }
  async function persist(publish = false) {
    setError('')
    if (publish && errors.length) { setError(errors.join(' · ')); return }
    setSaving(true)
    try {
      const status = publish ? 'published' : quiz.status
      const id = await saveQuiz({ ...quiz, status })
      setQuiz((value) => ({ ...value, id, status }))
      if (!quiz.id) navigate(`/quiz/${id}/edit`, { replace: true })
      setDirty(false)
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save the quiz.') } finally { setSaving(false) }
  }

  return <div className="editor-shell">
    <header className="editor-topbar"><Link className="icon-button" to="/dashboard" aria-label="Back to dashboard"><ArrowLeft /></Link><input className="title-input" aria-label="Quiz title" value={quiz.title} maxLength={120} onChange={(event) => changeQuiz({ title: event.target.value })} /><span className={`save-state ${dirty ? 'dirty' : ''}`}>{saving ? 'Saving…' : dirty ? 'Unsaved changes' : <><Check /> Saved</>}</span><Link className="button button-secondary" to={quiz.id ? `/quiz/${quiz.id}/preview` : '#'} aria-disabled={!quiz.id}><Eye /> Preview</Link><button className="button button-secondary" onClick={() => persist(false)} disabled={saving}><Save /> Save</button><button className="button button-primary" onClick={() => persist(true)} disabled={saving}>Publish</button></header>
    {error && <div className="editor-error"><ErrorBanner message={error} /></div>}
    <aside className="question-rail"><div className="rail-heading"><strong>Questions</strong><span>{quiz.questions.length}</span></div>{quiz.questions.map((item, index) => <button className={selected === index ? 'question-thumb active' : 'question-thumb'} key={item.id ?? index} onClick={() => setSelected(index)}><span>{index + 1}</span><div><strong>{item.prompt || 'Untitled question'}</strong><small>{kindLabels[item.kind]} · {item.timeLimit}s</small></div></button>)}<button className="add-question" onClick={addQuestion}><Plus /> Add question</button></aside>
    <main className="question-canvas">
      <div className="canvas-toolbar"><select value={question.kind} onChange={(event) => setKind(event.target.value as QuestionKind)} aria-label="Question type">{Object.entries(kindLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><label>Time <select value={question.timeLimit} onChange={(event) => changeQuestion({ timeLimit: Number(event.target.value) })}>{[5, 10, 15, 20, 30, 45, 60, 90, 120].map((time) => <option key={time} value={time}>{time} sec</option>)}</select></label><label>Points <select disabled={question.kind === 'poll'} value={question.pointsMode} onChange={(event) => changeQuestion({ pointsMode: event.target.value as Question['pointsMode'] })}><option value="standard">Standard</option><option value="double">Double</option><option value="none">No points</option></select></label></div>
      <textarea className="question-prompt" value={question.prompt} maxLength={300} onChange={(event) => changeQuestion({ prompt: event.target.value })} placeholder="Type your question…" aria-label="Question prompt" />
      {question.imagePath ? <div className="question-image"><img src={publicAssetUrl(question.imagePath) ?? ''} alt="Question visual" /><button className="icon-button" onClick={() => changeQuestion({ imagePath: null })} aria-label="Remove image"><X /></button></div> : <label className="image-drop"><ImagePlus /><span>Add an optional question image</span><small>PNG, JPEG, WebP, or GIF · max 5 MB</small><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => upload(event, 'question')} /></label>}
      {question.kind === 'typed' ? <div className="accepted-editor"><label><span>Accepted answers (one per line)</span><textarea value={question.acceptedAnswers.join('\n')} onChange={(event) => changeQuestion({ acceptedAnswers: event.target.value.split('\n') })} placeholder={'Example answer\nAlternate spelling'} /></label><p>Capitalization, Unicode width, and repeated spaces are normalized.</p></div> : <div className="options-editor">{question.options.map((option, index) => <div className={`option-editor answer-${index % 4}`} key={option.id}><span>{['▲', '◆', '●', '■'][index]}</span><input value={option.text} disabled={question.kind === 'true_false'} maxLength={160} onChange={(event) => changeOption(index, { text: event.target.value })} placeholder={`Answer ${index + 1}`} /><button className={option.isCorrect ? 'correct-toggle checked' : 'correct-toggle'} onClick={() => toggleCorrect(index)} aria-label={`${option.isCorrect ? 'Unmark' : 'Mark'} answer ${index + 1} as correct`} aria-pressed={Boolean(option.isCorrect)}><Check /></button>{question.kind !== 'true_false' && question.options.length > 2 && <button className="icon-button" onClick={() => changeQuestion({ options: question.options.filter((_, optionIndex) => optionIndex !== index) })}><X /></button>}</div>)}{question.kind !== 'true_false' && question.options.length < 4 && <button className="add-option" onClick={() => changeQuestion({ options: [...question.options, { id: crypto.randomUUID(), text: '', isCorrect: false }] })}><Plus /> Add answer</button>}</div>}
      <label className="explanation-field"><span>Answer explanation <small>shown after reveal</small></span><textarea maxLength={500} value={question.explanation} onChange={(event) => changeQuestion({ explanation: event.target.value })} placeholder="Why is this the right answer?" /></label>
    </main>
    <aside className="quiz-settings"><h3>Quiz details</h3><label><span>Description</span><textarea value={quiz.description} maxLength={500} onChange={(event) => changeQuiz({ description: event.target.value })} /></label><label className="cover-upload"><span>Cover image</span>{quiz.coverPath && <img src={publicAssetUrl(quiz.coverPath) ?? ''} alt="Quiz cover" />}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => upload(event, 'cover')} /></label><label className="switch-row"><span><strong>Shareable quiz</strong><small>Others can discover the title and preview it</small></span><input type="checkbox" checked={quiz.isPublic} onChange={(event) => changeQuiz({ isPublic: event.target.checked })} /></label><hr /><div className="question-actions"><button onClick={() => moveQuestion(-1)} disabled={selected === 0}><ArrowUp /> Move up</button><button onClick={() => moveQuestion(1)} disabled={selected === quiz.questions.length - 1}><ArrowDown /> Move down</button><button onClick={duplicateQuestion}><Copy /> Duplicate</button><button className="danger" onClick={removeQuestion} disabled={quiz.questions.length === 1}><Trash2 /> Delete</button></div>{errors.length > 0 && <div className="validation-summary"><strong>{errors.length} issue{errors.length === 1 ? '' : 's'} before publishing</strong><ul>{errors.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul></div>}</aside>
  </div>
}

import type { Question, Quiz } from './types'

export const QUESTION_LIMITS = { minOptions: 2, maxOptions: 4, minTime: 5, maxTime: 300 }

export function normalizeTypedAnswer(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('und')
}

export function validateQuestion(question: Question): string[] {
  const errors: string[] = []
  const label = `Question ${question.position + 1}`
  if (!question.prompt.trim()) errors.push(`${label}: prompt is required`)
  if (question.timeLimit < QUESTION_LIMITS.minTime || question.timeLimit > QUESTION_LIMITS.maxTime) {
    errors.push(`${label}: time must be ${QUESTION_LIMITS.minTime}–${QUESTION_LIMITS.maxTime} seconds`)
  }
  if (['single', 'true_false', 'multiple', 'poll'].includes(question.kind)) {
    if (question.options.length < QUESTION_LIMITS.minOptions || question.options.length > QUESTION_LIMITS.maxOptions) {
      errors.push(`${label}: choose 2–4 options`)
    }
    if (question.options.some((option) => !option.text.trim())) errors.push(`${label}: every option needs text`)
  }
  const correct = question.options.filter((option) => option.isCorrect)
  if ((question.kind === 'single' || question.kind === 'true_false') && correct.length !== 1) {
    errors.push(`${label}: choose exactly one correct answer`)
  }
  if (question.kind === 'multiple' && correct.length < 1) errors.push(`${label}: choose at least one correct answer`)
  if (question.kind === 'typed' && !question.acceptedAnswers.some((answer) => normalizeTypedAnswer(answer))) {
    errors.push(`${label}: add at least one accepted answer`)
  }
  return errors
}

export function validateQuiz(quiz: Quiz): string[] {
  const errors: string[] = []
  if (!quiz.title.trim()) errors.push('Quiz title is required')
  if (!quiz.questions.length) errors.push('Add at least one question')
  quiz.questions.forEach((question, index) => errors.push(...validateQuestion({ ...question, position: index })))
  return errors
}

export function isAnswerCorrect(question: Question, answer: unknown): boolean {
  if (question.kind === 'poll') return true
  if (question.kind === 'typed') {
    const normalized = normalizeTypedAnswer(String(answer ?? ''))
    return question.acceptedAnswers.map(normalizeTypedAnswer).includes(normalized)
  }
  const submitted = Array.isArray(answer) ? answer.map(String).sort() : [String(answer)]
  const expected = question.options.filter((option) => option.isCorrect).map((option) => option.id).sort()
  return submitted.length === expected.length && submitted.every((value, index) => value === expected[index])
}

export function calculateScore(correct: boolean, responseMs: number, timeLimitSeconds: number, mode: Question['pointsMode']): number {
  if (!correct || mode === 'none') return 0
  const base = mode === 'double' ? 2000 : 1000
  const durationMs = Math.max(1, timeLimitSeconds * 1000)
  const speed = Math.max(0, Math.min(1, 1 - responseMs / durationMs))
  return Math.round(base * (0.5 + 0.5 * speed))
}

export function makeBlankQuestion(position = 0): Question {
  return {
    prompt: '',
    kind: 'single',
    options: [
      { id: crypto.randomUUID(), text: '', isCorrect: true },
      { id: crypto.randomUUID(), text: '', isCorrect: false },
    ],
    acceptedAnswers: [],
    explanation: '',
    timeLimit: 20,
    pointsMode: 'standard',
    position,
  }
}

export function makeBlankQuiz(): Quiz {
  return { title: 'Untitled quiz', description: '', status: 'draft', isPublic: false, questions: [makeBlankQuestion()] }
}

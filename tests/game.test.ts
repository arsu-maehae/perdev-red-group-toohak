import { describe, expect, it } from 'vitest'
import { calculateScore, isAnswerCorrect, normalizeTypedAnswer, validateQuestion, validateQuiz } from '../src/lib/game'
import type { Question, Quiz } from '../src/lib/types'

const baseQuestion: Question = {
  prompt: 'Which are red?', kind: 'multiple', position: 0, timeLimit: 20, pointsMode: 'standard', explanation: '', acceptedAnswers: [],
  options: [{ id: 'a', text: 'Rose', isCorrect: true }, { id: 'b', text: 'Sky' }, { id: 'c', text: 'Ruby', isCorrect: true }],
}

describe('typed-answer normalization', () => {
  it('normalizes Unicode width, case, outer whitespace, and repeated whitespace', () => {
    expect(normalizeTypedAnswer('  ＴＯＯＨＡＫ   Red  ')).toBe('toohak red')
  })
  it('accepts normalized alternate answers', () => {
    const question: Question = { ...baseQuestion, kind: 'typed', options: [], acceptedAnswers: ['กรุงเทพมหานคร', 'Bangkok'] }
    expect(isAnswerCorrect(question, '  BANGKOK ')).toBe(true)
    expect(isAnswerCorrect(question, 'Chiang Mai')).toBe(false)
  })
})

describe('question validation', () => {
  it('requires exact correctness rules and 2–4 choices', () => {
    expect(validateQuestion({ ...baseQuestion, kind: 'single' })).toContain('Question 1: choose exactly one correct answer')
    expect(validateQuestion({ ...baseQuestion, options: [baseQuestion.options[0]] })).toContain('Question 1: choose 2–4 options')
  })
  it('requires accepted typed answers and honors poll scoring', () => {
    expect(validateQuestion({ ...baseQuestion, kind: 'typed', options: [], acceptedAnswers: [] })).toContain('Question 1: add at least one accepted answer')
    expect(validateQuestion({ ...baseQuestion, kind: 'poll', pointsMode: 'none' })).toEqual([])
  })
  it('blocks publishing an empty quiz', () => {
    const quiz: Quiz = { title: '', description: '', status: 'draft', isPublic: false, questions: [] }
    expect(validateQuiz(quiz)).toEqual(['Quiz title is required', 'Add at least one question'])
  })
})

describe('answer and score rules', () => {
  it('uses exact-set matching for multiple select', () => {
    expect(isAnswerCorrect(baseQuestion, ['c', 'a'])).toBe(true)
    expect(isAnswerCorrect(baseQuestion, ['a'])).toBe(false)
    expect(isAnswerCorrect(baseQuestion, ['a', 'b', 'c'])).toBe(false)
  })
  it('awards 50–100% of base according to server response time', () => {
    expect(calculateScore(true, 0, 20, 'standard')).toBe(1000)
    expect(calculateScore(true, 10_000, 20, 'standard')).toBe(750)
    expect(calculateScore(true, 20_000, 20, 'standard')).toBe(500)
    expect(calculateScore(true, 25_000, 20, 'double')).toBe(1000)
    expect(calculateScore(false, 0, 20, 'standard')).toBe(0)
    expect(calculateScore(true, 0, 20, 'none')).toBe(0)
  })
})

import { describe, expect, it } from 'vitest'
import { reportToCsv } from '../src/lib/csv'

describe('report CSV', () => {
  it('includes a UTF-8 BOM, details, and safe RFC-style escaping', () => {
    const csv = reportToCsv([{ playerId: '1', nickname: 'Mae, "Red"', score: 900, accuracy: 100, averageResponseMs: 1200, answers: [{ question: '2 + 2?', answer: '4', correct: true, points: 900, responseMs: 1200 }] }])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"Mae, ""Red"""')
    expect(csv).toContain('"2 + 2?"')
  })
})

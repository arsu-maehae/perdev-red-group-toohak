import type { ReportRow } from './types'

const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`

export function reportToCsv(rows: ReportRow[]): string {
  const records: unknown[][] = [['Nickname', 'Score', 'Accuracy (%)', 'Average response (ms)', 'Question', 'Answer', 'Correct', 'Points', 'Response (ms)']]
  rows.forEach((row) => {
    if (!row.answers.length) records.push([row.nickname, row.score, row.accuracy, row.averageResponseMs, '', '', '', '', ''])
    row.answers.forEach((answer) => records.push([
      row.nickname, row.score, row.accuracy, row.averageResponseMs, answer.question,
      JSON.stringify(answer.answer), answer.correct, answer.points, answer.responseMs,
    ]))
  })
  return `\uFEFF${records.map((record) => record.map(escape).join(',')).join('\r\n')}`
}

export function downloadCsv(filename: string, rows: ReportRow[]) {
  const blob = new Blob([reportToCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url)
}

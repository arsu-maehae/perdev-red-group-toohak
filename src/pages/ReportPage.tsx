import { ArrowLeft, Download, Gauge, Target, Trash2, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { EmptyState, ErrorBanner, Loading } from '../components/ui'
import { deleteSessionReport, getAssignmentReport, getSessionReport } from '../lib/api'
import { downloadCsv } from '../lib/csv'
import { useHost } from '../lib/useHost'
import type { ReportRow } from '../lib/types'

export function ReportPage() {
  const { kind = 'session', reportId = '' } = useParams(); const { user, loading: authLoading } = useHost()
  const [rows, setRows] = useState<ReportRow[] | null>(null); const [error, setError] = useState('')
  useEffect(() => { if (!user) return; const request = kind === 'assignment' ? getAssignmentReport(reportId) : getSessionReport(reportId); void request.then(setRows).catch((caught) => setError(caught.message)) }, [kind, reportId, user])
  const summary = useMemo(() => ({ accuracy: rows?.length ? Math.round(rows.reduce((sum, row) => sum + row.accuracy, 0) / rows.length) : 0, response: rows?.length ? Math.round(rows.reduce((sum, row) => sum + row.averageResponseMs, 0) / rows.length) : 0 }), [rows])
  if (authLoading) return <Loading />
  if (!user) return <Navigate to="/auth" replace />
  return <Layout wide><div className="report-header"><div><Link className="back-link" to="/dashboard"><ArrowLeft /> Dashboard</Link><span className="eyebrow">{kind === 'assignment' ? 'ASSIGNMENT' : 'LIVE SESSION'} REPORT</span><h1>Group performance</h1><p>Scores, accuracy, timing, and question-by-question details.</p></div>{rows && <div className="button-row"><button className="button button-primary" onClick={() => downloadCsv(`toohak-${kind}-${reportId}.csv`, rows)}><Download /> Download CSV</button>{kind === 'session' && <button className="button button-secondary danger" onClick={async () => { if (confirm('Permanently delete this session and its report?')) { await deleteSessionReport(reportId); location.hash = '#/dashboard' } }}><Trash2 /> Delete report</button>}</div>}</div>{error && <ErrorBanner message={error} />}{!rows ? !error && <Loading label="Calculating report…" /> : !rows.length ? <EmptyState icon={<Users />} title="No responses yet">Results appear after players submit answers.</EmptyState> : <><div className="stats-grid"><article><span className="stat-icon"><Users /></span><div><strong>{rows.length}</strong><small>Participants</small></div></article><article><span className="stat-icon"><Target /></span><div><strong>{summary.accuracy}%</strong><small>Average accuracy</small></div></article><article><span className="stat-icon"><Gauge /></span><div><strong>{(summary.response / 1000).toFixed(1)}s</strong><small>Average response</small></div></article></div><div className="report-table-wrap"><table className="report-table"><thead><tr><th>Player</th><th>Score</th><th>Accuracy</th><th>Avg. response</th><th>Answered</th></tr></thead><tbody>{[...rows].sort((a, b) => b.score - a.score).map((row) => <tr key={row.playerId}><td><strong>{row.nickname}</strong></td><td>{row.score.toLocaleString()}</td><td><span className="accuracy-bar"><i style={{ width: `${row.accuracy}%` }} /></span>{row.accuracy}%</td><td>{(row.averageResponseMs / 1000).toFixed(1)}s</td><td>{row.answers.length}</td></tr>)}</tbody></table></div><details className="question-details"><summary>Question-level data</summary>{rows.map((row) => <section key={row.playerId}><h3>{row.nickname}</h3>{row.answers.map((answer, index) => <article key={index} className={answer.correct ? 'correct-row' : 'wrong-row'}><span>{answer.correct ? '✓' : '×'}</span><div><strong>{answer.question}</strong><small>{JSON.stringify(answer.answer)}</small></div><b>+{answer.points} · {(answer.responseMs / 1000).toFixed(1)}s</b></article>)}</section>)}</details></>}
  </Layout>
}

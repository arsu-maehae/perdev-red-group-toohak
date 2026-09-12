import { AlertCircle, CheckCircle2, LoaderCircle, Trophy, WifiOff } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { AnswerOption, Player, PublicQuestion } from '../lib/types'
import { publicAssetUrl } from '../lib/supabase'

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="state-card" role="status"><LoaderCircle className="spin" /><p>{label}</p></div>
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="alert alert-error" role="alert"><AlertCircle /><span>{message}</span>{onRetry && <button onClick={onRetry}>Try again</button>}</div>
}

export function SuccessBanner({ children }: { children: ReactNode }) {
  return <div className="alert alert-success" role="status"><CheckCircle2 />{children}</div>
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="empty-state">{icon}<h2>{title}</h2><p>{children}</p>{action}</div>
}

export function ConnectionBadge({ connected }: { connected: boolean }) {
  return <span className={connected ? 'connection connected' : 'connection disconnected'}>{connected ? <><span className="pulse-dot" /> Live</> : <><WifiOff /> Reconnecting</>}</span>
}

const symbols = ['▲', '◆', '●', '■']
export function AnswerGrid({ question, value, disabled, correctIds = [], onChange }: {
  question: PublicQuestion
  value: unknown
  disabled?: boolean
  correctIds?: string[]
  onChange: (value: unknown) => void
}) {
  if (question.kind === 'typed') return <label className="typed-answer"><span>Your answer</span><input autoFocus maxLength={160} disabled={disabled} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)} placeholder="Type your answer…" /></label>
  const values = Array.isArray(value) ? value : value ? [value] : []
  function select(option: AnswerOption) {
    if (disabled) return
    if (question.kind === 'multiple') onChange(values.includes(option.id) ? values.filter((id) => id !== option.id) : [...values, option.id])
    else onChange(option.id)
  }
  return <div className="answer-grid" role={question.kind === 'multiple' ? 'group' : 'radiogroup'} aria-label="Answer choices">
    {question.options.map((option, index) => {
      const selected = values.includes(option.id)
      const correct = correctIds.includes(option.id)
      return <button key={option.id} type="button" disabled={disabled} onClick={() => select(option)}
        className={`answer-card answer-${index % 4} ${selected ? 'selected' : ''} ${correct ? 'correct' : ''}`}
        role={question.kind === 'multiple' ? 'checkbox' : 'radio'} aria-checked={selected}>
        <span className="answer-symbol" aria-hidden="true">{symbols[index]}</span><span>{option.text}</span>
        {question.kind === 'multiple' && <span className="choice-box" aria-hidden="true">{selected ? '✓' : ''}</span>}
      </button>
    })}
  </div>
}

export function Leaderboard({ players, podium = false }: { players: Player[]; podium?: boolean }) {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname))
  if (podium) {
    const podiumOrder = [sorted[1], sorted[0], sorted[2]]
    return <div className="podium" aria-label="Top three players">{podiumOrder.map((player, index) => player && <div className={`podium-place podium-${index}`} key={player.id}>
      <Trophy /><strong>{player.nickname}</strong><span>{player.score.toLocaleString()}</span><div>{index === 1 ? '1' : index === 0 ? '2' : '3'}</div>
    </div>)}</div>
  }
  return <ol className="leaderboard-list">{sorted.slice(0, 10).map((player, index) => <li key={player.id}>
    <span className="rank">{index + 1}</span><strong>{player.nickname}</strong><span>{player.score.toLocaleString()}</span>
  </li>)}</ol>
}

export function PhaseTimer({ endsAt }: { endsAt: string | null }) {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    const update = () => setRemaining(endsAt ? Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000)) : 0)
    update(); const interval = window.setInterval(update, 250); return () => clearInterval(interval)
  }, [endsAt])
  return <div className="timer" aria-live="polite"><span>{remaining}</span><small>SEC</small></div>
}

export function QuestionMedia({ path, alt = 'Question illustration' }: { path?: string | null; alt?: string }) {
  const url = publicAssetUrl(path)
  return url ? <img className="game-question-image" src={url} alt={alt} /> : null
}

import { Check, Flame, LogOut, Send } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Brand, SoundToggle } from '../components/Layout'
import { AnswerGrid, ConnectionBadge, ErrorBanner, Leaderboard, Loading, PhaseTimer, QuestionMedia } from '../components/ui'
import { getGameState, heartbeat, submitAnswer, watchGame } from '../lib/api'
import { playCue } from '../lib/sound'
import type { GameState } from '../lib/types'

export function PlayerGamePage() {
  const { sessionId = '' } = useParams(); const [state, setState] = useState<GameState | null>(null); const [answer, setAnswer] = useState<unknown>(null)
  const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false); const [connected, setConnected] = useState(true)
  const [muted, setMutedState] = useState(() => localStorage.getItem('toohak-muted') === 'true'); const previousQuestion = useRef(''); const previousPhase = useRef('')
  const load = useCallback(async () => { try { setState(await getGameState(sessionId)); setConnected(true); setError('') } catch (caught) { setConnected(false); setError(caught instanceof Error ? caught.message : 'Reconnecting…') } }, [sessionId])
  useEffect(() => { void load(); const stop = watchGame(sessionId, () => void load()); const poll = setInterval(() => void load(), 2000); const beat = setInterval(() => void heartbeat(sessionId).catch(() => setConnected(false)), 15000); return () => { stop(); clearInterval(poll); clearInterval(beat) } }, [load, sessionId])
  useEffect(() => { if (state?.question?.id && previousQuestion.current !== state.question.id) { setAnswer(null); previousQuestion.current = state.question.id } }, [state?.question?.id])
  useEffect(() => { if (state && previousPhase.current && previousPhase.current !== state.phase) playCue(state.phase === 'final' ? 'win' : state.phase === 'reveal' ? 'reveal' : 'tick', muted); if (state) previousPhase.current = state.phase }, [state?.phase, muted])
  function setMuted(value: boolean) { localStorage.setItem('toohak-muted', String(value)); setMutedState(value) }
  async function send() { if (!state?.question) return; setSubmitting(true); setError(''); try { await submitAnswer(sessionId, state.question.id, answer); await load() } catch (caught) { setError(caught instanceof Error ? caught.message : 'Answer was not accepted.') } finally { setSubmitting(false) } }
  if (!state) return <div className="game-loading">{error ? <ErrorBanner message={error} onRetry={load} /> : <Loading label="Finding your game…" />}</div>
  const me = state.players.find((player) => player.id === sessionStorage.getItem(`toohak-player:${sessionId}`))
  const hasAnswer = state.ownSubmission != null
  const canSubmit = state.question?.kind === 'typed' ? String(answer ?? '').trim().length > 0 : Array.isArray(answer) ? answer.length > 0 : Boolean(answer)
  return <div className="game-shell player-game"><header className="game-topbar"><Brand compact /><div className="player-score"><span>{me?.nickname ?? 'Player'}</span><strong>{me?.score.toLocaleString() ?? 0}</strong></div><ConnectionBadge connected={connected} /><SoundToggle muted={muted} setMuted={setMuted} /><Link className="icon-button surface" to="/" aria-label="Leave game"><LogOut /></Link></header>{error && <div className="floating-error"><ErrorBanner message={error} /></div>}
    {state.hostDisconnected && <div className="host-away">Host disconnected. The room will close automatically if they do not return.</div>}
    {state.phase === 'lobby' ? <main className="player-wait"><div className="waiting-orbit"><span>{me?.nickname.slice(0, 1).toUpperCase()}</span></div><span className="eyebrow">YOU’RE IN!</span><h1>{me?.nickname}</h1><p>Look up at the host screen. The game will begin soon.</p><div className="player-count"><span className="pulse-dot" /> {state.players.length} players in the room</div></main>
      : state.phase === 'countdown' ? <main className="countdown-stage"><span>QUESTION {state.currentQuestionIndex + 1}</span><PhaseTimer endsAt={state.phaseEndsAt} /><h2>Get ready!</h2></main>
      : state.phase === 'question_open' && state.question ? <main className="player-question"><div className="mobile-question-head"><span>{state.currentQuestionIndex + 1} / {state.totalQuestions}</span><PhaseTimer endsAt={state.phaseEndsAt} /></div><h1>{state.question.prompt}</h1><QuestionMedia path={state.question.imagePath} />{hasAnswer ? <div className="submitted-card"><Check /><h2>Answer locked in!</h2><p>Watch the host screen for the reveal.</p></div> : <><AnswerGrid question={state.question} value={answer} onChange={setAnswer} /><button className="button button-dark button-large submit-answer" disabled={!canSubmit || submitting} onClick={send}><Send /> {submitting ? 'Sending…' : 'Submit answer'}</button></>}</main>
      : state.phase === 'reveal' ? <main className={`result-card ${state.ownSubmission?.correct ? 'is-correct' : 'is-wrong'}`}><span className="result-icon">{state.ownSubmission?.correct ? '✓' : '×'}</span><h1>{state.question?.kind === 'poll' ? 'Thanks for sharing!' : state.ownSubmission?.correct ? 'Correct!' : 'Not this time'}</h1><strong>+{state.ownSubmission?.points ?? 0}</strong>{me && me.streak > 1 && <p className="streak"><Flame /> {me.streak} answer streak!</p>}<p>{state.reveal?.explanation}</p></main>
      : state.phase === 'leaderboard' ? <main className="player-leaderboard"><span className="eyebrow">CURRENT STANDINGS</span><h1>Leaderboard</h1><Leaderboard players={state.leaderboard.slice(0, 5)} />{me && <div className="your-position">Your score <strong>{me.score.toLocaleString()}</strong></div>}</main>
      : state.phase === 'final' || state.phase === 'ended' ? <main className="final-stage"><span className="eyebrow">GAME COMPLETE</span><h1>Brilliant work!</h1><Leaderboard players={state.leaderboard} podium /><div className="your-position">Your final score <strong>{me?.score.toLocaleString() ?? 0}</strong></div><Link className="button button-light button-large" to="/">Join another game</Link></main> : null}
  </div>
}

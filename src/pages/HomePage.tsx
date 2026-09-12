import { ArrowRight, BarChart3, Gamepad2, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { ErrorBanner } from '../components/ui'
import { SetupNotice } from '../components/SetupNotice'
import { joinGame } from '../lib/api'
import { useI18n } from '../lib/i18n'
import { isSupabaseConfigured } from '../lib/supabase'

export function HomePage() {
  const [searchParams] = useSearchParams()
  const [pin, setPin] = useState(() => (searchParams.get('pin') ?? '').replace(/\D/g, '').slice(0, 6))
  const [nickname, setNickname] = useState('')
  const [step, setStep] = useState<'pin' | 'nickname'>(() => /^\d{6}$/.test(searchParams.get('pin') ?? '') ? 'nickname' : 'pin')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const navigate = useNavigate()
  const { t } = useI18n()

  async function handleJoin(event: FormEvent) {
    event.preventDefault(); setError('')
    if (step === 'pin') {
      if (!/^\d{6}$/.test(pin)) { setError('Enter the 6-digit game PIN.'); return }
      setStep('nickname'); return
    }
    if (nickname.trim().length < 2) { setError('Nickname must be at least 2 characters.'); return }
    if (!isSupabaseConfigured) { setError('Connect Supabase before joining a live game. See the setup notice below.'); return }
    setJoining(true)
    try {
      const result = await joinGame(pin, nickname)
      sessionStorage.setItem(`toohak-player:${result.sessionId}`, result.playerId)
      navigate(`/play/${result.sessionId}`)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not join the game.') }
    finally { setJoining(false) }
  }

  return <Layout wide>
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow"><Sparkles /> Live learning, reimagined</span>
        <h1>Turn every question into a <em>moment.</em></h1>
        <p>Host energetic live quizzes, learn at your own pace, and see what your group understands—instantly.</p>
        <div className="trust-row"><span><ShieldCheck /> Server-scored</span><span><Users /> Built for groups</span><span><BarChart3 /> Useful reports</span></div>
      </div>
      <div className="join-panel-wrap">
        <div className="floating-shape shape-one">▲</div><div className="floating-shape shape-two">●</div>
        <form className="join-panel" onSubmit={handleJoin}>
          <div className="join-icon"><Gamepad2 /></div><span className="overline">PLAYER JOIN</span><h2>{step === 'pin' ? t('join') : 'Choose your name'}</h2>
          {error && <ErrorBanner message={error} />}
          {step === 'pin' ? <label><span>{t('pin')}</span><input className="pin-input" inputMode="numeric" maxLength={6} autoFocus value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} placeholder="000 000" aria-describedby="pin-help" /><small id="pin-help">Ask your host for the six-digit PIN</small></label>
            : <label><span>{t('nickname')}</span><input maxLength={24} autoFocus value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="How should we call you?" /></label>}
          <button className="button button-primary button-large" disabled={joining}>{joining ? 'Joining…' : <>{t('continue')} <ArrowRight /></>}</button>
          {step === 'nickname' && <button className="text-button centered" type="button" onClick={() => setStep('pin')}>Use a different PIN</button>}
        </form>
      </div>
    </section>
    <SetupNotice />
    <section className="feature-strip" aria-label="Toohak features">
      <article><span>01</span><h3>Host it live</h3><p>Up to 50 players, synchronized questions, streaks, and a podium finish.</p></article>
      <article><span>02</span><h3>Assign practice</h3><p>Share a deadline-based challenge that learners complete on their own time.</p></article>
      <article><span>03</span><h3>Learn from results</h3><p>See accuracy and response times, then download a clean CSV report.</p></article>
    </section>
  </Layout>
}

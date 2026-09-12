import { ArrowLeft, KeyRound, Mail, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand } from '../components/Layout'
import { ErrorBanner, SuccessBanner } from '../components/ui'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type Mode = 'login' | 'signup' | 'reset'

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('')
    if (!isSupabaseConfigured) { setError('Configure Supabase in .env.local before using host accounts.'); return }
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error
        navigate('/dashboard')
      } else if (mode === 'signup') {
        if (password.length < 8) throw new Error('Use at least 8 characters for your password.')
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: `${location.origin}${location.pathname}#/dashboard` } }); if (error) throw error
        if (data.session) navigate('/dashboard'); else setMessage('Check your inbox to confirm your account, then log in.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}#/auth` }); if (error) throw error
        setMessage('Password-reset instructions are on their way.')
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Authentication failed.') }
    finally { setBusy(false) }
  }

  return <div className="auth-page">
    <div className="auth-art"><Brand /><div><span className="eyebrow">FOR EDUCATORS & TEAMS</span><h1>Bring the room<br /><em>to life.</em></h1><p>Build a quiz, invite your group, and turn answers into insight.</p></div><div className="auth-quote">“Learning feels different when everyone is in the moment.”</div></div>
    <main className="auth-main"><Link className="back-link" to="/"><ArrowLeft /> Back to join</Link>
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-icon">{mode === 'signup' ? <UserPlus /> : mode === 'reset' ? <Mail /> : <KeyRound />}</div>
        <span className="overline">HOST ACCESS</span><h2>{mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your host account' : 'Reset your password'}</h2>
        <p>{mode === 'login' ? 'Sign in to manage quizzes and live sessions.' : mode === 'signup' ? 'Start creating interactive quizzes in minutes.' : 'We’ll email you a secure reset link.'}</p>
        {error && <ErrorBanner message={error} />}{message && <SuccessBanner>{message}</SuccessBanner>}
        {mode === 'signup' && <label><span>Display name</span><input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>}
        <label><span>Email address</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
        {mode !== 'reset' && <label><span>Password</span><input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></label>}
        {mode === 'login' && <button type="button" className="text-button align-right" onClick={() => setMode('reset')}>Forgot password?</button>}
        <button className="button button-primary button-large" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send reset link'}</button>
        <div className="auth-switch">{mode === 'login' ? <>New to Toohak? <button type="button" onClick={() => setMode('signup')}>Create an account</button></> : <>Already have an account? <button type="button" onClick={() => setMode('login')}>Log in</button></>}</div>
      </form>
    </main>
  </div>
}

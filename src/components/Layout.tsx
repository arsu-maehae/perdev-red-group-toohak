import { Menu, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className="brand" to="/" aria-label="Toohak home"><span className="brand-mark">T!</span>{!compact && <span>Toohak <small>RED GROUP</small></span>}</Link>
}

export function Layout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const [user, setUser] = useState<User | null>(null)
  const [menu, setMenu] = useState(false)
  const navigate = useNavigate()
  const { language, setLanguage, t } = useI18n()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])
  const isHost = user && !user.is_anonymous
  async function logout() { await supabase.auth.signOut(); navigate('/') }
  return <div className="app-shell">
    <header className="topbar">
      <Brand />
      <button className="icon-button mobile-menu" onClick={() => setMenu((value) => !value)} aria-label="Toggle navigation">{menu ? <X /> : <Menu />}</button>
      <nav className={menu ? 'nav open' : 'nav'} aria-label="Primary navigation">
        <NavLink to="/">{t('join')}</NavLink>
        {isHost && <NavLink to="/dashboard">{t('dashboard')}</NavLink>}
        <button className="text-button" onClick={() => setLanguage(language === 'en' ? 'th' : 'en')}>{t('language')}</button>
        {isHost ? <button className="button button-ghost small" onClick={logout}>{t('logout')}</button> : <Link className="button button-light small" to="/auth">{t('host')}</Link>}
      </nav>
    </header>
    <main className={wide ? 'page page-wide' : 'page'}>{children}</main>
    <footer><span>Toohak — Red Group</span><span>Fast questions. Bright minds.</span></footer>
  </div>
}

export function SoundToggle({ muted, setMuted }: { muted: boolean; setMuted: (muted: boolean) => void }) {
  return <button className="icon-button surface" onClick={() => setMuted(!muted)} aria-label={muted ? 'Enable sound effects' : 'Mute sound effects'}>
    {muted ? <VolumeX /> : <Volume2 />}
  </button>
}

import { Database, ExternalLink } from 'lucide-react'
import { isSupabaseConfigured } from '../lib/supabase'

export function SetupNotice() {
  if (isSupabaseConfigured) return null
  return <div className="setup-notice" role="status"><Database /><div><strong>Backend setup required</strong><p>Add your Supabase URL and publishable key to <code>.env.local</code>, then apply the included migrations.</p></div><a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Open Supabase <ExternalLink /></a></div>
}

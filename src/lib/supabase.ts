import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const isSupabaseConfigured = Boolean(url && key && !url?.includes('your-project'))

export const supabase = createClient(
  url || 'https://example.supabase.co',
  key || 'sb_publishable_placeholder',
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    realtime: { params: { eventsPerSecond: 10 } },
  },
)

export function publicAssetUrl(path?: string | null): string | null {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  return supabase.storage.from('quiz-images').getPublicUrl(path).data.publicUrl
}

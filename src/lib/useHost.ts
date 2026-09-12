import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export function useHost() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => { setUser(data.user && !data.user.is_anonymous ? data.user : null); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user && !session.user.is_anonymous ? session.user : null); setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])
  return { user, loading }
}

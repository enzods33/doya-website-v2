import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase.js'

const AuthContext = createContext({
  ready: true,
  user: null,
  signIn: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(!supabase)
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!supabase) return undefined
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setUser(data.session?.user ?? null)
      setReady(true)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setReady(true)
      if (session?.user) supabase.rpc('claim_orders').then(() => {})
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({
    ready,
    user,
    async signIn(email) {
      if (!supabase) throw new Error('commerce_disabled')
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/compte` },
      })
      if (error) throw error
    },
    async signOut() {
      if (!supabase) return
      await supabase.auth.signOut()
    },
  }), [ready, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

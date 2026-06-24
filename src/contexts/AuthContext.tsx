import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type RoleState = {
  session: Session | null
  loading: boolean
  roleLoading: boolean
  isAdmin: boolean
  isCupido: boolean
  refreshRole: (userIdOverride?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<RoleState | null>(null)

async function checkMembership(table: 'administradores' | 'cupidos', userId: string) {
  if (!supabase) return false
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  if (error) return false
  return Boolean(data?.id)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCupido, setIsCupido] = useState(false)

  const refreshRole = async (userIdOverride?: string) => {
    const userId = userIdOverride ?? session?.user?.id
    if (!userId) {
      setIsAdmin(false)
      setIsCupido(false)
      setRoleLoading(false)
      return
    }
    setRoleLoading(true)
    try {
      const [admin, cupido] = await Promise.all([
        checkMembership('administradores', userId),
        checkMembership('cupidos', userId),
      ])
      setIsAdmin(admin)
      setIsCupido(cupido || admin)
    } finally {
      setRoleLoading(false)
    }
  }

  const signOut = async () => {
    if (!supabase) return
    sessionStorage.removeItem('cupido_access_ok')
    await supabase.auth.signOut()
    setIsAdmin(false)
    setIsCupido(false)
    setRoleLoading(false)
  }

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!supabase) {
        if (!cancelled) {
          setSession(null)
          setLoading(false)
        }
        return
      }

      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setSession(data.session ?? null)
      setLoading(false)
    }

    void load()

    if (!supabase) return () => {}

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setRoleLoading(Boolean(next?.user?.id))
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (loading) return
    void refreshRole()
  }, [loading, session?.user?.id])

  const value = useMemo<RoleState>(
    () => ({ session, loading, roleLoading, isAdmin, isCupido, refreshRole, signOut }),
    [session, loading, roleLoading, isAdmin, isCupido],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('AuthProvider ausente')
  return ctx
}

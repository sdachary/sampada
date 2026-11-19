import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { workerAuth } from './api'
import { mapWorkerUser, AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checked, setChecked] = useState(false)
  const [checking, setChecking] = useState(false)
  const { pathname } = useLocation()

  // ponytail: loading is derived, so a client-side navigation into /dashboard
  // holds ProtectedRoute on this same render instead of flashing a redirect.
  const loading = pathname.startsWith('/dashboard') && (!checked || checking)

  const checkAuth = useCallback(async () => {
    setChecking(true)
    try {
      const result = await workerAuth.me()
      setUser(result?.user ? mapWorkerUser(result.user) : null)
    } catch {
      setUser(null)
    } finally {
      setChecking(false)
      setChecked(true)
    }
  }, [])

  // Public pages never need a session probe (no /me 502 on preview deploys).
  useEffect(() => {
    if (pathname.startsWith('/dashboard') && !checked && !checking) checkAuth()
  }, [pathname, checked, checking, checkAuth])

  const logout = async () => {
    try { await workerAuth.logout() } catch {}
    setUser(null)
  }

  const setOnboarded = (value) => {
    setUser(u => (u ? { ...u, onboarded: value } : u))
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, checkAuth, setOnboarded }}>
      {children}
    </AuthContext.Provider>
  )
}

import { useState, useEffect } from 'react'
import { auth, workerAuth, WORKER_AUTH_ENABLED } from './api'
import { mapWorkerUser } from './auth-context'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    // Better-Auth stays preferred when both sessions exist (it drives data calls pre-cutover).
    // The worker fallback runs on empty session AND on throw — Rails down ≠ logged out.
    let session = null
    try {
      session = await auth.me()
    } catch {
      // Better-Auth unavailable; fall through to the Worker session.
    }
    if (session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email,
        first_name: session.user.name?.split(' ')[0] || '',
        last_name: session.user.name?.split(' ').slice(1).join(' ') || '',
        currency: session.user.currency || 'INR',
        onboarded: session.user.onboarded ?? false,
      })
    } else if (WORKER_AUTH_ENABLED) {
      // Worker session via the same-origin /api/worker proxy.
      try {
        const workerUser = await workerAuth.me()
        if (workerUser?.user) {
          setUser(mapWorkerUser(workerUser.user))
        }
      } catch {
        // Not authenticated
      }
    }
    setLoading(false)
  }

  const login = async (email, password, website = '') => {
    const res = await auth.login({ email, password, website })
    // Session carried by httpOnly cookie via the same-origin /api/auth proxy —
    // no token in localStorage (XSS-safe). The worker injects it as Bearer for /api/v1/*.
    await checkAuth()
    return res
  }

  const register = async (data) => {
    const res = await auth.register(data)
    await checkAuth()
    return res
  }

  const logout = async () => {
    try { await auth.logout() } catch {}
    // Best-effort: a live worker session would resurrect the user on next checkAuth.
    if (WORKER_AUTH_ENABLED) {
      try { await workerAuth.logout() } catch {}
    }
    setUser(null)
  }

  const setOnboarded = (value) => {
    setUser(u => (u ? { ...u, onboarded: value } : u))
  }

  const forgotPassword = async (email, website = '') => {
    return auth.forgotPassword(email, website)
  }

  const resetPassword = async (token, password) => {
    return auth.resetPassword(token, password)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, forgotPassword, resetPassword, checkAuth, setOnboarded }}>
      {children}
    </AuthContext.Provider>
  )
}

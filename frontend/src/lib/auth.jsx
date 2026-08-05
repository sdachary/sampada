import { createContext, useContext, useState, useEffect } from 'react'
import { api, auth } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const session = await auth.me()
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          first_name: session.user.name?.split(' ')[0] || '',
          last_name: session.user.name?.split(' ').slice(1).join(' ') || '',
          currency: session.user.currency || 'INR',
          onboarded: session.user.onboarded ?? false,
        })
      }
    } catch {
      // Not authenticated
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const res = await auth.login({ email, password })
    // Session carried by httpOnly cookie via the same-origin /auth/v2 proxy —
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
    setUser(null)
  }

  const forgotPassword = async (email) => {
    return auth.forgotPassword(email)
  }

  const resetPassword = async (token, password) => {
    return auth.resetPassword(token, password)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, forgotPassword, resetPassword, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
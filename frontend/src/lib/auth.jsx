import { useState, useEffect } from 'react'
import { workerAuth } from './api'
import { mapWorkerUser, AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const result = await workerAuth.me()
      setUser(result?.user ? mapWorkerUser(result.user) : null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

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

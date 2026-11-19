import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { workerAuth } from '../lib/api'
import AuthLayout from './AuthLayout'
import { Button } from '../components/ui'

export default function MagicLinkVerify() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { checkAuth } = useAuth()
  const [error, setError] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const token = params.get('token')
    if (!token) {
      setError('This sign-in link is missing its token.')
      return
    }
    ;(async () => {
      try {
        const result = await workerAuth.magicLinkVerify(token)
        await checkAuth()
        // No passkey yet — register one now so this link is never needed again.
        navigate(result?.needsPasskey ? '/register' : '/dashboard', { replace: true })
      } catch (err) {
        setError(err.message || 'This sign-in link is invalid or expired.')
      }
    })()
  }, [params, navigate, checkAuth])

  return (
    <AuthLayout title="Signing you in" subtitle="One moment…" error={error}>
      {error && (
        <Button onClick={() => navigate('/login', { replace: true })}>
          Back to sign in
        </Button>
      )}
    </AuthLayout>
  )
}

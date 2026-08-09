import { useEffect } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../core/AuthContext'
import { useAuthSheet } from '../components/AuthSheet'

/** Deep-link /login opens the auth bottom sheet on the home feed. */
export function LoginPage() {
  const { isAuthenticated } = useAuth()
  const { openLogin } = useAuthSheet()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next') || '/'
  const sessionExpired = searchParams.get('sessionExpired') === '1'

  useEffect(() => {
    if (!isAuthenticated) {
      openLogin({ next, sessionExpired })
    }
  }, [isAuthenticated, next, openLogin, sessionExpired])

  if (isAuthenticated) {
    return <Navigate to={next} replace />
  }

  return <Navigate to="/" replace />
}

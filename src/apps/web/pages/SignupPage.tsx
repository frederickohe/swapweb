import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../core/AuthContext'
import { useAuthSheet } from '../components/AuthSheet'

/** Deep-link /signup opens the auth bottom sheet in signup mode. */
export function SignupPage() {
  const { isAuthenticated } = useAuth()
  const { openSignup } = useAuthSheet()

  useEffect(() => {
    if (!isAuthenticated) {
      openSignup({ next: '/' })
    }
  }, [isAuthenticated, openSignup])

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Navigate to="/" replace />
}

import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './core/AuthContext'
import { storage } from './core/utils/storage'
import { useAuthSheet } from './components/AuthSheet'

export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  const { openLogin } = useAuthSheet()
  const location = useLocation()
  const hasSession = isAuthenticated || !!storage.getItem('token')
  const next = `${location.pathname}${location.search}`

  useEffect(() => {
    if (!hasSession) {
      openLogin({ next })
    }
  }, [hasSession, next, openLogin])

  if (!hasSession) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

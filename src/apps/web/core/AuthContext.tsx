import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { setUnauthorizedHandler } from './apiClient'
import type { LoginRequest, SignupRequest, UserProfile } from './models'
import { authApi } from './services'
import { storage } from './utils/storage'
import { ApiError } from './utils/apiError'

interface AuthContextValue {
  token: string | null
  user: UserProfile | null
  isAuthenticated: boolean
  login: (payload: LoginRequest) => Promise<void>
  signup: (payload: SignupRequest) => Promise<void>
  logout: () => Promise<void>
  logoutLocally: () => void
  refreshUser: () => Promise<UserProfile | null>
  setUserProfile: (user: UserProfile) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  const [token, setToken] = useState<string | null>(() => storage.getItem('token'))
  const [user, setUser] = useState<UserProfile | null>(() =>
    storage.getJson<UserProfile>('user'),
  )

  const clearSession = useCallback(() => {
    setToken(null)
    setUser(null)
    storage.removeItem('token')
    storage.removeItem('refresh_token')
    storage.removeItem('user')
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession()
      navigate('/', { replace: true })
      window.dispatchEvent(
        new CustomEvent('swappro:auth-required', {
          detail: { sessionExpired: true, next: '/' },
        }),
      )
    })
  }, [clearSession, navigate])

  useEffect(() => {
    if (!token || user) return

    let cancelled = false
    void authApi
      .me()
      .then((profile) => {
        if (cancelled) return
        setUser(profile)
        storage.setJson('user', profile)
      })
      .catch(() => {
        if (!cancelled) clearSession()
      })

    return () => {
      cancelled = true
    }
  }, [token, user, clearSession])

  const login = useCallback(async (payload: LoginRequest) => {
    try {
      const data = await authApi.login(payload)
      flushSync(() => {
        setToken(data.token)
        setUser(data.user)
      })
      storage.setItem('token', data.token)
      storage.setJson('user', data.user)
    } catch (err) {
      clearSession()
      if (err instanceof ApiError || err instanceof Error) throw err
      throw new Error('Unable to sign in')
    }
  }, [clearSession])

  const signup = useCallback(async (payload: SignupRequest) => {
    await authApi.signup(payload)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore
    }
    clearSession()
  }, [clearSession])

  const setUserProfile = useCallback((profile: UserProfile) => {
    setUser(profile)
    storage.setJson('user', profile)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!storage.getItem('token')) return null
    try {
      const profile = await authApi.me()
      setUserProfile(profile)
      return profile
    } catch {
      return null
    }
  }, [setUserProfile])

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: !!token,
      login,
      signup,
      logout,
      logoutLocally: clearSession,
      refreshUser,
      setUserProfile,
    }),
    [token, user, login, signup, logout, clearSession, refreshUser, setUserProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

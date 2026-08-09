import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../core/AuthContext'
import { ApiError } from '../core/utils/apiError'

export const AUTH_REQUIRED_EVENT = 'swappro:auth-required'

export type AuthSheetMode = 'login' | 'signup'

export interface OpenAuthOptions {
  next?: string
  mode?: AuthSheetMode
  sessionExpired?: boolean
}

interface AuthSheetContextValue {
  openLogin: (options?: OpenAuthOptions) => void
  openSignup: (options?: OpenAuthOptions) => void
  closeAuthSheet: () => void
  isAuthSheetOpen: boolean
}

const AuthSheetContext = createContext<AuthSheetContextValue | null>(null)

export function requestAuth(options: OpenAuthOptions = {}): void {
  window.dispatchEvent(
    new CustomEvent<OpenAuthOptions>(AUTH_REQUIRED_EVENT, { detail: options }),
  )
}

export function AuthSheetProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { login, signup, isAuthenticated } = useAuth()

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<AuthSheetMode>('login')
  const [nextPath, setNextPath] = useState('/')
  const [sessionExpired, setSessionExpired] = useState(false)
  const [visible, setVisible] = useState(false)

  const [fullname, setFullname] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setFullname('')
    setEmail('')
    setPhone('')
    setPassword('')
    setSubmitting(false)
    setErrorMessage(null)
    setInfoMessage(null)
  }, [])

  const closeAuthSheet = useCallback(() => {
    setVisible(false)
    window.setTimeout(() => {
      setOpen(false)
      resetForm()
      setSessionExpired(false)
    }, 280)
  }, [resetForm])

  const openSheet = useCallback((options: OpenAuthOptions = {}) => {
    setNextPath(options.next || '/')
    setMode(options.mode ?? 'login')
    setSessionExpired(!!options.sessionExpired)
    setErrorMessage(null)
    setInfoMessage(null)
    setOpen(true)
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const openLogin = useCallback(
    (options: OpenAuthOptions = {}) => openSheet({ ...options, mode: 'login' }),
    [openSheet],
  )

  const openSignup = useCallback(
    (options: OpenAuthOptions = {}) => openSheet({ ...options, mode: 'signup' }),
    [openSheet],
  )

  useEffect(() => {
    const onNeedAuth = (event: Event) => {
      const detail = (event as CustomEvent<OpenAuthOptions>).detail ?? {}
      openSheet(detail)
    }
    window.addEventListener(AUTH_REQUIRED_EVENT, onNeedAuth)
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, onNeedAuth)
  }, [openSheet])

  useEffect(() => {
    if (isAuthenticated && open) {
      closeAuthSheet()
    }
  }, [isAuthenticated, open, closeAuthSheet])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAuthSheet()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, closeAuthSheet])

  const finishAuth = useCallback(() => {
    const target = nextPath || '/'
    closeAuthSheet()
    navigate(target, { replace: true })
  }, [closeAuthSheet, navigate, nextPath])

  const submitLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setSubmitting(true)
    setErrorMessage(null)
    try {
      await login({ email: email.trim(), password })
      finishAuth()
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Unable to sign in. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const submitSignup = async (e: FormEvent) => {
    e.preventDefault()
    if (!fullname.trim() || !email.trim() || password.length < 4) return
    setSubmitting(true)
    setErrorMessage(null)
    setInfoMessage(null)
    try {
      await signup({
        fullname: fullname.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
      })
      try {
        await login({ email: email.trim(), password })
        finishAuth()
      } catch {
        setMode('login')
        setInfoMessage('Account created. Please sign in to continue.')
      }
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Unable to create account.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const value = useMemo<AuthSheetContextValue>(
    () => ({
      openLogin,
      openSignup,
      closeAuthSheet,
      isAuthSheetOpen: open,
    }),
    [openLogin, openSignup, closeAuthSheet, open],
  )

  return (
    <AuthSheetContext.Provider value={value}>
      {children}

      {open && (
        <div
          className={`auth-sheet-root${visible ? ' open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={mode === 'login' ? 'Sign in' : 'Create account'}
        >
          <button
            type="button"
            className="auth-sheet-backdrop"
            aria-label="Close"
            onClick={closeAuthSheet}
          />
          <div className="auth-sheet-panel">
            <div className="auth-sheet-handle" aria-hidden />
            <div className="auth-sheet-header">
              <h2 className="auth-sheet-title">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <button
                type="button"
                className="auth-sheet-close"
                aria-label="Close"
                onClick={closeAuthSheet}
              >
                <i className="ri-close-line" aria-hidden />
              </button>
            </div>
            <p className="auth-sheet-sub">
              {mode === 'login'
                ? 'Sign in to list items and swap.'
                : 'Join SwapPro to list items and make swaps.'}
            </p>

            {sessionExpired && mode === 'login' && (
              <div className="auth-alert auth-alert-info">
                <i className="ri-time-line" aria-hidden />
                <span>Your session expired. Please sign in again.</span>
              </div>
            )}

            {infoMessage && (
              <div className="auth-alert auth-alert-info">
                <i className="ri-information-line" aria-hidden />
                <span>{infoMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="auth-alert auth-alert-error">
                <i className="ri-error-warning-line" aria-hidden />
                <span>{errorMessage}</span>
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={(e) => void submitLogin(e)} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="sheet-email">
                    Email
                  </label>
                  <input
                    id="sheet-email"
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="sheet-password">
                    Password
                  </label>
                  <input
                    id="sheet-password"
                    type="password"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={submitting}
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            ) : (
              <form onSubmit={(e) => void submitSignup(e)} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="sheet-fullname">
                    Full name
                  </label>
                  <input
                    id="sheet-fullname"
                    className="form-input"
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="sheet-signup-email">
                    Email
                  </label>
                  <input
                    id="sheet-signup-email"
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="sheet-phone">
                    Phone (optional)
                  </label>
                  <input
                    id="sheet-phone"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="sheet-signup-password">
                    Password
                  </label>
                  <input
                    id="sheet-signup-password"
                    type="password"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={4}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={submitting}
                >
                  {submitting ? 'Creating…' : 'Create Account'}
                </button>
              </form>
            )}

            <div className="auth-sheet-footer">
              {mode === 'login' ? (
                <button
                  type="button"
                  className="auth-sheet-switch"
                  onClick={() => {
                    setMode('signup')
                    setErrorMessage(null)
                    setInfoMessage(null)
                    setSessionExpired(false)
                  }}
                >
                  New here? <strong>Create an account</strong>
                </button>
              ) : (
                <button
                  type="button"
                  className="auth-sheet-switch"
                  onClick={() => {
                    setMode('login')
                    setErrorMessage(null)
                    setInfoMessage(null)
                  }}
                >
                  Already have an account? <strong>Sign in</strong>
                </button>
              )}
              <button
                type="button"
                className="auth-sheet-browse"
                onClick={closeAuthSheet}
              >
                Continue browsing
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthSheetContext.Provider>
  )
}

export function useAuthSheet(): AuthSheetContextValue {
  const ctx = useContext(AuthSheetContext)
  if (!ctx) throw new Error('useAuthSheet must be used within AuthSheetProvider')
  return ctx
}

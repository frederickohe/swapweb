import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../core/AuthContext'
import { notificationsApi } from '../core/services'
import { useAuthSheet } from '../components/AuthSheet'

const navItems = [
  { to: '/', end: true, icon: 'ph-duotone ph-house-line', label: 'Home', auth: false },
  { to: '/my-listings', end: false, icon: 'ph ph-list', label: 'My Listings', auth: true },
  {
    to: '/swap-bay',
    end: false,
    icon: 'ph ph-arrows-left-right',
    label: 'Swap Bay',
    auth: true,
  },
  { to: '/profile', end: false, icon: 'ph ph-user', label: 'Profile', auth: true },
] as const

export function AppShell() {
  const { isAuthenticated } = useAuth()
  const { openLogin } = useAuthSheet()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [unreadCount, setUnreadCount] = useState(0)

  const path = location.pathname
  const isHome = path === '/'
  const isProfileRoot = path === '/profile'
  const isMyListings = path === '/my-listings'
  const isSwapBay = path === '/swap-bay'
  const isListingDetail = /^\/listings\/[^/]+$/.test(path)
  const isSwapFlow = /\/listings\/[^/]+\/swap/.test(path)
  const hidesShellTop =
    isMyListings ||
    isSwapBay ||
    isListingDetail ||
    isSwapFlow ||
    path.startsWith('/profile/') ||
    path.startsWith('/swap-bay/') ||
    path === '/notifications' ||
    path === '/my-listings/filters'
  const showSearchChrome = !hidesShellTop && !isProfileRoot
  const showFab =
    !path.startsWith('/profile') &&
    !path.startsWith('/swap-bay') &&
    !isListingDetail &&
    !isSwapFlow &&
    path !== '/notifications' &&
    path !== '/my-listings/filters'
  const showFilterFab = isMyListings
  const hideGlassNav = isSwapFlow


  useEffect(() => {
    setQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0)
      return
    }

    let cancelled = false
    const load = () => {
      void notificationsApi.unreadCount().then((count) => {
        if (!cancelled) setUnreadCount(count)
      })
    }

    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
    }
  }, [isAuthenticated, path])

  const goToListings = (keyword?: string) => {
    const q = keyword?.trim() ?? ''
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    const qs = params.toString()
    navigate(qs ? `/?${qs}` : '/', {
      state: { refresh: Date.now() },
    })
  }

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    goToListings(query)
  }

  const onSearchIconClick = () => {
    // Search icon opens the full listings feed (all properties).
    setQuery('')
    goToListings()
  }

  const openNotifications = () => {
    if (!isAuthenticated) {
      openLogin({ next: '/notifications' })
      return
    }
    navigate('/notifications')
  }

  const onProtectedNav = (e: MouseEvent, to: string, needsAuth: boolean) => {
    if (!needsAuth || isAuthenticated) return
    e.preventDefault()
    openLogin({ next: to })
  }

  return (
    <div className="web-app shell">
      {!hidesShellTop && (
        <header className={`shell-top ${isHome ? 'shell-top-home' : ''}`}>
          {isProfileRoot ? (
            <div className="shell-page-heading">
              <h1>Your Profile</h1>
            </div>
          ) : showSearchChrome ? (
            <>
              <form className="shell-search" onSubmit={onSearch} role="search">
                <input
                  type="search"
                  enterKeyHint="search"
                  placeholder="Search ..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search listings"
                />
                <button
                  type="button"
                  className="shell-search-btn"
                  aria-label="Browse all listings"
                  onClick={onSearchIconClick}
                >
                  <i className="ri-search-line" aria-hidden />
                </button>
              </form>

              <button
                type="button"
                className="shell-notif"
                aria-label={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} unread`
                    : 'Notifications'
                }
                onClick={openNotifications}
              >
                <i className="ph-duotone ph-bell" aria-hidden />
                {unreadCount > 0 && <span className="shell-notif-dot" aria-hidden />}
              </button>
            </>
          ) : null}
        </header>
      )}

      <main className={`shell-main${hideGlassNav ? ' shell-main-flush' : ''}`}>
        <Outlet />
      </main>

      {showFab && (
        <div className={`fab-stack${showFilterFab ? ' fab-stack-dual' : ''}`}>
          {showFilterFab && (
            <button
              type="button"
              className="fab fab-filter"
              aria-label="Filter listings"
              onClick={() => navigate('/my-listings/filters', { state: location.state })}
            >
              <i className="ri-equalizer-line" aria-hidden />
            </button>
          )}
          <button
            type="button"
            className="fab"
            aria-label="Create listing"
            onClick={() => {
              if (isAuthenticated) {
                navigate('/listings/new')
                return
              }
              openLogin({ next: '/listings/new' })
            }}
          >
            <i className="ri-add-line" aria-hidden />
          </button>
        </div>
      )}

      {!hideGlassNav && (
        <nav className="shell-glass-nav" aria-label="Main">
          <div className="shell-glass-nav-inner">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `shell-glass-item${isActive ? ' active' : ''}`
                }
                aria-label={item.label}
                onClick={(e) => onProtectedNav(e, item.to, item.auth)}
              >
                <i className={item.icon} aria-hidden />
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

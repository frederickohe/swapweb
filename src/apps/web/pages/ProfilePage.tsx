import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../core/AuthContext'
import type { Listing, UserProfile } from '../core/models'
import { authApi, listingsApi } from '../core/services'
import { ApiError } from '../core/utils/apiError'

function formatPrice(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `GH₵ ${value.toFixed(2)}`
}

export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(user)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [me, mine] = await Promise.all([authApi.me(), listingsApi.mine()])
      setProfile(me)
      setListings(mine)
    } catch (err) {
      if (user) {
        setProfile(user)
        try {
          setListings(await listingsApi.mine())
        } catch {
          setListings([])
        }
      } else {
        setError(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : 'Failed to load profile',
        )
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(t)
  }, [toast])

  const onLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      setConfirmLogout(false)
      navigate('/', { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  const soon = (label: string) => setToast(`${label} coming soon`)

  if (loading) {
    return (
      <div className="loading-state">
        <i className="ri-loader-4-line spin" aria-hidden />
        <p>Loading profile…</p>
      </div>
    )
  }

  if (error && !profile) {
    return <div className="error-state">{error}</div>
  }

  const preview = listings.slice(0, 2)
  const name = profile?.full_name?.trim() || 'User'
  const email = profile?.email || '—'
  const photo = profile?.profile_picture_url

  const menu = [
    {
      label: 'Edit Profile',
      icon: 'ri-edit-line',
      onClick: () => navigate('/profile/edit'),
    },
    {
      label: 'Change Password',
      icon: 'ri-lock-line',
      onClick: () => navigate('/profile/password'),
    },
    {
      label: '2 Factor Authentication',
      icon: 'ri-shield-keyhole-line',
      onClick: () => navigate('/profile/2fa'),
    },
    {
      label: 'Help & Support',
      icon: 'ri-question-line',
      onClick: () => navigate('/profile/help'),
    },
    {
      label: 'Delete Account',
      icon: 'ri-delete-bin-line',
      onClick: () => soon('Delete account'),
    },
    {
      label: 'Log Out',
      icon: 'ri-logout-box-r-line',
      onClick: () => setConfirmLogout(true),
    },
  ]

  return (
    <div className="profile-page">
      <div className="profile-hero">
        <div className="profile-avatar-wrap">
          {photo ? (
            <img src={photo} alt="" className="profile-avatar" />
          ) : (
            <div className="profile-avatar profile-avatar-placeholder">
              <i className="ri-user-fill" aria-hidden />
            </div>
          )}
        </div>
        <h1 className="profile-name">{name}</h1>
        <p className="profile-email">{email}</p>
      </div>

      <div className="profile-menu">
        {menu.map((item) => (
          <button
            key={item.label}
            type="button"
            className="profile-menu-item"
            onClick={item.onClick}
          >
            <i className={`${item.icon} profile-menu-icon`} aria-hidden />
            <span className="profile-menu-label">{item.label}</span>
            <i className="ri-arrow-right-s-line profile-menu-chevron" aria-hidden />
          </button>
        ))}
      </div>

      <section className="profile-listings">
        <h2 className="profile-listings-title">Your Listings</h2>
        {preview.length === 0 ? (
          <p className="profile-listings-empty">No listings yet.</p>
        ) : (
          <div className="profile-listings-grid">
            {preview.map((listing, i) => (
              <Link
                key={listing.id}
                to={`/listings/${listing.id}`}
                className={`profile-listing-card${i === 1 ? ' tall' : ''}`}
              >
                <div className="profile-listing-media">
                  {listing.images[0] ? (
                    <img src={listing.images[0]} alt="" loading="lazy" />
                  ) : (
                    <div className="feed-card-placeholder">
                      <i className="ri-image-line" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="profile-listing-title">{listing.title}</div>
                <div className="profile-listing-sub">
                  {listing.category || listing.condition || 'Listing'}
                </div>
                <div className="profile-listing-price">
                  {formatPrice(listing.estimated_value)}
                </div>
              </Link>
            ))}
          </div>
        )}
        <Link to="/my-listings" className="profile-see-all">
          See All
        </Link>
      </section>

      {toast && <div className="profile-toast">{toast}</div>}

      {confirmLogout && (
        <div className="profile-dialog-root" role="dialog" aria-modal="true">
          <button
            type="button"
            className="profile-dialog-backdrop"
            aria-label="Cancel"
            onClick={() => setConfirmLogout(false)}
          />
          <div className="profile-dialog">
            <h3>Log out?</h3>
            <p>You can log back in at any time.</p>
            <div className="profile-dialog-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmLogout(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn profile-logout-btn"
                disabled={loggingOut}
                onClick={() => void onLogout()}
              >
                {loggingOut ? 'Signing out…' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

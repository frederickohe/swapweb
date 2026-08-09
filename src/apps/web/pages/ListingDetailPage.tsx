import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ScreenTopBar } from '../components/ScreenTopBar'
import { useAuth } from '../core/AuthContext'
import { useAuthSheet } from '../components/AuthSheet'
import type { Listing } from '../core/models'
import {
  formatListingDate,
  formatListingPriceValue,
  listingWishlistLabels,
} from '../core/models'
import { listingsApi } from '../core/services'
import { ApiError } from '../core/utils/apiError'

export function ListingDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { openLogin } = useAuthSheet()

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)

    void listingsApi
      .getById(id)
      .then((data) => {
        if (!cancelled) setListing(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : 'Failed to load listing',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="listing-detail-page">
        <ScreenTopBar title="" showAvatar={false} />
        <div className="loading-state">
          <i className="ri-loader-4-line spin" aria-hidden />
          <p>Loading listing…</p>
        </div>
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="listing-detail-page">
        <ScreenTopBar title="" showAvatar={false} />
        <div className="error-state">
          <p>{error || 'Listing not found'}</p>
          <Link to="/" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            Back to browse
          </Link>
        </div>
      </div>
    )
  }

  const isOwn = !!user && listing.user_id === user.id
  const images = listing.images.length > 0 ? listing.images : []
  const wishlist = listingWishlistLabels(listing)
  const price = formatListingPriceValue(listing.estimated_value)
  const date = formatListingDate(listing.created_at)
  const receipts = listing.ownership_documents_available ? 'Yes' : 'No'
  const status = listing.condition || listing.status || '—'

  const startSwap = () => {
    if (!isAuthenticated) {
      openLogin({ next: `/listings/${listing.id}/swap` })
      return
    }
    navigate(`/listings/${listing.id}/swap`, { state: { target: listing } })
  }

  return (
    <div className="listing-detail-page">
      <ScreenTopBar title="" showAvatar={false} />

      <div className="listing-detail-body">
        <div className="listing-detail-gallery" role="list">
          {images.length > 0 ? (
            images.map((src, index) => (
              <button
                key={`${src}-${index}`}
                type="button"
                className="listing-detail-thumb"
                role="listitem"
                onClick={() => setLightboxIndex(index)}
              >
                <img src={src} alt="" />
              </button>
            ))
          ) : (
            <div className="listing-detail-thumb listing-detail-thumb-empty">
              <i className="ri-image-line" aria-hidden />
            </div>
          )}
        </div>

        <h1 className="listing-detail-title">{listing.title}</h1>

        {listing.description ? (
          <p className="listing-detail-desc">{listing.description}</p>
        ) : null}

        <div className="listing-detail-location">
          <span className="listing-detail-label">Location :</span>
          <i className="ri-map-pin-line" aria-hidden />
          <span>{listing.location || '—'}</span>
        </div>

        {wishlist.length > 0 && (
          <section className="listing-detail-wishlist">
            <h2>User Wishlist</h2>
            <div className="listing-wishlist-chips">
              {wishlist.map((label) => (
                <span key={label} className="listing-wishlist-chip">
                  {label}
                </span>
              ))}
            </div>
          </section>
        )}

        <div className="listing-detail-price">
          <span className="listing-detail-label">Price :</span>
          <span className="listing-detail-price-value">{price}</span>
        </div>

        <div className="listing-detail-meta-grid">
          <div className="listing-meta-tile">
            <i className="ri-calendar-line" aria-hidden />
            <div>
              <strong>Date</strong>
              <span>{date}</span>
            </div>
          </div>
          <div className="listing-meta-tile">
            <i className="ri-price-tag-3-line" aria-hidden />
            <div>
              <strong>Category</strong>
              <span>{listing.category || '—'}</span>
            </div>
          </div>
          <div className="listing-meta-tile">
            <i className="ri-file-list-3-line" aria-hidden />
            <div>
              <strong>Receipts</strong>
              <span>{receipts}</span>
            </div>
          </div>
          <div className="listing-meta-tile">
            <i className="ri-information-line" aria-hidden />
            <div>
              <strong>Status</strong>
              <span>{status}</span>
            </div>
          </div>
        </div>
      </div>

      {!isOwn && (
        <div className="listing-detail-cta">
          <button type="button" className="listing-swap-this-btn" onClick={startSwap}>
            Swap This
          </button>
        </div>
      )}

      {lightboxIndex != null && images[lightboxIndex] && (
        <div
          className="listing-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Listing image"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            className="listing-lightbox-close"
            aria-label="Close"
            onClick={() => setLightboxIndex(null)}
          >
            <i className="ri-close-line" aria-hidden />
          </button>
          <img
            src={images[lightboxIndex]}
            alt={listing.title}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

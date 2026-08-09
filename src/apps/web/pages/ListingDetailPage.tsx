import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../core/AuthContext'
import { useAuthSheet } from '../components/AuthSheet'
import type { Listing } from '../core/models'
import { listingsApi, swapsApi } from '../core/services'
import { ApiError } from '../core/utils/apiError'

export function ListingDetailPage() {
  const { id = '' } = useParams()
  const { isAuthenticated, user } = useAuth()
  const { openLogin } = useAuthSheet()

  const [listing, setListing] = useState<Listing | null>(null)
  const [myListings, setMyListings] = useState<Listing[]>([])
  const [offerId, setOfferId] = useState('')
  const [loading, setLoading] = useState(true)
  const [swapping, setSwapping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [swapMessage, setSwapMessage] = useState<string | null>(null)

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

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    void listingsApi
      .mine()
      .then((items) => {
        if (cancelled) return
        setMyListings(items.filter((item) => item.id !== id))
      })
      .catch(() => {
        if (!cancelled) setMyListings([])
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, id])

  const onSwap = async () => {
    if (!listing) return
    if (!isAuthenticated) {
      openLogin({ next: `/listings/${listing.id}` })
      return
    }
    if (!offerId) {
      setSwapMessage('Select one of your listings to offer.')
      return
    }

    setSwapping(true)
    setSwapMessage(null)
    try {
      await swapsApi.createRequest(listing.id, offerId)
      setSwapMessage('Swap request sent. Check Swap Bay for status.')
    } catch (err) {
      setSwapMessage(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not create swap request',
      )
    } finally {
      setSwapping(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <i className="ri-loader-4-line spin" aria-hidden />
        <p>Loading listing…</p>
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="error-state">
        <p>{error || 'Listing not found'}</p>
        <Link to="/" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to browse
        </Link>
      </div>
    )
  }

  const isOwn = !!user && listing.user_id === user.id
  const image = listing.images[0]

  return (
    <div>
      <div className="detail-hero">
        {image ? (
          <img src={image} alt={listing.title} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#aaa' }}>
            <i className="ri-image-line" style={{ fontSize: 40 }} aria-hidden />
          </div>
        )}
      </div>

      <h1 className="page-title">{listing.title}</h1>
      <div className="detail-meta">
        {listing.category && <span className="chip">{listing.category}</span>}
        {listing.condition && <span className="chip">{listing.condition}</span>}
        {listing.location && <span className="chip">{listing.location}</span>}
        {listing.estimated_value != null && (
          <span className="chip">Est. GHS {listing.estimated_value.toLocaleString()}</span>
        )}
      </div>

      {listing.description && (
        <p style={{ margin: '0 0 1rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
          {listing.description}
        </p>
      )}

      {listing.owner_fullname && (
        <p className="page-sub" style={{ marginBottom: '0.5rem' }}>
          Listed by {listing.owner_fullname}
        </p>
      )}

      {!isOwn && (
        <div className="detail-actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          {isAuthenticated && myListings.length > 0 && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="offerListing">
                Offer one of your listings
              </label>
              <select
                id="offerListing"
                className="form-select"
                value={offerId}
                onChange={(e) => setOfferId(e.target.value)}
              >
                <option value="">Select a listing</option>
                {myListings.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            disabled={swapping}
            onClick={() => void onSwap()}
          >
            {swapping ? 'Sending…' : isAuthenticated ? 'Swap This' : 'Log in to Swap'}
          </button>

          {isAuthenticated && myListings.length === 0 && (
            <p className="form-hint">
              You need a listing to swap.{' '}
              <Link to="/listings/new">Create one</Link>
            </p>
          )}

          {swapMessage && <p className="form-hint">{swapMessage}</p>}
        </div>
      )}
    </div>
  )
}

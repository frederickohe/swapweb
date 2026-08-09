import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ScreenTopBar } from '../components/ScreenTopBar'
import type { Listing } from '../core/models'
import {
  hasActiveFilters,
  matchesListingFilters,
  type ListingFilters,
} from '../core/listingFilters'
import { listingsApi } from '../core/services'
import { ApiError } from '../core/utils/apiError'

function formatPrice(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `GH₵ ${value.toFixed(2)}`
}

export function MyListingsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [isGridView, setIsGridView] = useState(true)
  const [filters, setFilters] = useState<ListingFilters | null>(
    (location.state as { filters?: ListingFilters } | null)?.filters ?? null,
  )

  useEffect(() => {
    const next = (location.state as { filters?: ListingFilters } | null)?.filters
    if (next) setFilters(next)
  }, [location.state])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void listingsApi
      .mine()
      .then((items) => {
        if (!cancelled) setListings(items)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : 'Failed to load your listings',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const visible = useMemo(
    () => listings.filter((item) => matchesListingFilters(item, filters, query)),
    [listings, filters, query],
  )

  return (
    <div className="my-listings-page">
      <ScreenTopBar title="Your Listings" showBack={false} />

      <div className="listings-toolbar">
        <form
          className="listings-search"
          role="search"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="search"
            placeholder="Search ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search your listings"
          />
          <i className="ri-search-line" aria-hidden />
        </form>
        <button
          type="button"
          className="listings-view-toggle"
          aria-label={isGridView ? 'Switch to list view' : 'Switch to grid view'}
          onClick={() => setIsGridView((v) => !v)}
        >
          <i
            className={isGridView ? 'ri-list-check' : 'ri-grid-fill'}
            aria-hidden
          />
        </button>
      </div>

      {hasActiveFilters(filters) && (
        <div className="listings-filter-chip-row">
          <button
            type="button"
            className="listings-filter-chip"
            onClick={() =>
              navigate('/my-listings/filters', { state: { filters } })
            }
          >
            Filters active
            <i className="ri-equalizer-line" aria-hidden />
          </button>
          <button
            type="button"
            className="listings-filter-clear"
            onClick={() => {
              setFilters(null)
              navigate('/my-listings', { replace: true, state: {} })
            }}
          >
            Clear
          </button>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <i className="ri-loader-4-line spin" aria-hidden />
          <p>Loading…</p>
        </div>
      )}

      {!loading && error && <div className="error-state">{error}</div>}

      {!loading && !error && listings.length === 0 && (
        <div className="empty-state">
          <p>You have no listings yet.</p>
          <p className="form-hint" style={{ marginTop: '0.5rem' }}>
            Tap + to add your first item.
          </p>
        </div>
      )}

      {!loading && !error && listings.length > 0 && visible.length === 0 && (
        <div className="empty-state">
          <p>No listings match your search or filters.</p>
        </div>
      )}

      {!loading && !error && visible.length > 0 && isGridView && (
        <div className="listing-grid">
          {visible.map((listing) => (
            <Link key={listing.id} to={`/listings/${listing.id}`} className="listing-card">
              <div className="listing-card-media">
                {listing.images[0] ? (
                  <img src={listing.images[0]} alt="" loading="lazy" />
                ) : (
                  <div className="listing-card-placeholder">
                    <i className="ri-image-line" aria-hidden />
                  </div>
                )}
              </div>
              <div className="listing-card-body">
                <div className="listing-card-title">{listing.title}</div>
                <div className="listing-card-meta">
                  {[listing.category, listing.condition].filter(Boolean).join(' · ') ||
                    'Listing'}
                </div>
                <div className="listing-card-price">{formatPrice(listing.estimated_value)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && !error && visible.length > 0 && !isGridView && (
        <div className="listing-list">
          {visible.map((listing) => (
            <Link key={listing.id} to={`/listings/${listing.id}`} className="listing-list-row">
              {listing.images[0] ? (
                <img src={listing.images[0]} alt="" loading="lazy" />
              ) : (
                <div className="listing-list-placeholder">
                  <i className="ri-image-line" aria-hidden />
                </div>
              )}
              <div>
                <div className="listing-card-title">{listing.title}</div>
                <div className="listing-card-meta">
                  {[listing.category, listing.condition].filter(Boolean).join(' · ') ||
                    'Listing'}
                </div>
                <div className="listing-card-price">{formatPrice(listing.estimated_value)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

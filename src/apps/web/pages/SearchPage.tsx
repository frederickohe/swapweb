import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ScreenTopBar } from '../components/ScreenTopBar'
import {
  EMPTY_LISTING_FILTERS,
  type ListingFilters,
} from '../core/listingFilters'
import type { Listing } from '../core/models'
import {
  formatListingPriceValue,
  listingWishlistLabels,
} from '../core/models'
import { listingsApi } from '../core/services'
import { ApiError } from '../core/utils/apiError'

export function SearchPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const keyword = searchParams.get('q')?.trim() || ''
  const category = searchParams.get('category')?.trim() || ''

  const [query, setQuery] = useState(keyword)
  const [wishlistQuery, setWishlistQuery] = useState('')
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGridView, setIsGridView] = useState(false)
  const [filters, setFilters] = useState<ListingFilters | null>(
    (location.state as { filters?: ListingFilters } | null)?.filters ?? null,
  )

  useEffect(() => {
    setQuery(keyword)
  }, [keyword])

  useEffect(() => {
    const next = (location.state as { filters?: ListingFilters } | null)?.filters
    if (next) setFilters(next)
  }, [location.state])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listingsApi.search({
        keyword: keyword || undefined,
        category: filters?.category || category || undefined,
        condition: filters?.condition || undefined,
        location: filters?.location.trim() || undefined,
        minValue: filters && filters.minPrice > 0 ? filters.minPrice : undefined,
        maxValue: filters && filters.maxPrice > 0 ? filters.maxPrice : undefined,
        page: 1,
        size: 100,
      })
      setListings(res.items)
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Failed to search listings',
      )
    } finally {
      setLoading(false)
    }
  }, [keyword, category, filters])

  useEffect(() => {
    void load()
  }, [load])

  const visible = useMemo(() => {
    const wish = wishlistQuery.trim().toLowerCase()
    if (!wish) return listings
    return listings.filter((listing) =>
      listingWishlistLabels(listing).some((item) => item.toLowerCase().includes(wish)),
    )
  }, [listings, wishlistQuery])

  const onSearch = (e?: FormEvent) => {
    e?.preventDefault()
    const params = new URLSearchParams()
    const q = query.trim()
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    const qs = params.toString()
    navigate(qs ? `/search?${qs}` : '/search', { state: { filters } })
  }

  const openFilters = () => {
    navigate('/search/filters', {
      state: {
        filters: filters ?? EMPTY_LISTING_FILTERS,
        returnTo: `${location.pathname}${location.search}`,
      },
    })
  }

  const left = visible.filter((_, i) => i % 2 === 0)
  const right = visible.filter((_, i) => i % 2 === 1)
  const wishLabel = wishlistQuery.trim()
  const queryLabel = keyword ? `"${keyword}"` : category || 'listings'

  return (
    <div className="search-page">
      <ScreenTopBar title="Search Properties" />

      <div className="search-toolbar">
        <form className="shell-search shell-search-home" onSubmit={onSearch} role="search">
          <input
            type="search"
            enterKeyHint="search"
            placeholder="find swap item"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search listings"
          />
          <button type="submit" className="shell-search-btn" aria-label="Search">
            <i className="ri-search-line" aria-hidden />
          </button>
        </form>
        <button
          type="button"
          className="search-view-toggle"
          aria-label={isGridView ? 'Show list view' : 'Show grid view'}
          onClick={() => setIsGridView((value) => !value)}
        >
          <i className={isGridView ? 'ri-list-check' : 'ri-grid-fill'} aria-hidden />
        </button>
      </div>

      <form className="shell-search search-wishlist" onSubmit={(e) => e.preventDefault()}>
        <input
          type="search"
          placeholder="Type wishlist"
          value={wishlistQuery}
          onChange={(e) => setWishlistQuery(e.target.value)}
          aria-label="Filter by wishlist"
        />
        <i className="ri-heart-line search-wishlist-icon" aria-hidden />
      </form>

      {loading && (
        <div className="loading-state">
          <i className="ri-loader-4-line spin" aria-hidden />
          <p>Searching…</p>
        </div>
      )}

      {!loading && error && <div className="error-state">{error}</div>}

      {!loading && !error && visible.length === 0 && (
        <div className="empty-state">
          <p>
            {wishLabel
              ? `No listings with wishlist “${wishLabel}”`
              : `No results for ${queryLabel}`}
          </p>
        </div>
      )}

      {!loading && !error && visible.length > 0 && !isGridView && (
        <div className="search-list">
          {visible.map((listing) => (
            <SearchListCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {!loading && !error && visible.length > 0 && isGridView && (
        <div className="masonry-grid search-grid">
          <div className="masonry-col">
            {left.map((listing, i) => (
              <SearchGridCard key={listing.id} listing={listing} tall={i % 2 === 0} />
            ))}
          </div>
          <div className="masonry-col">
            {right.map((listing, i) => (
              <SearchGridCard key={listing.id} listing={listing} tall={i % 2 === 1} />
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className="fab fab-filter search-filter-fab"
        aria-label="Filter listings"
        onClick={openFilters}
      >
        <i className="ri-equalizer-line" aria-hidden />
      </button>
    </div>
  )
}

function SearchListCard({ listing }: { listing: Listing }) {
  const wishlist = listingWishlistLabels(listing)
  const extra = wishlist.length > 3 ? wishlist.length - 3 : 0
  const chips = wishlist.slice(0, 3)

  return (
    <Link to={`/listings/${listing.id}`} className="search-list-card">
      <div className="search-list-thumb">
        {listing.images[0] ? (
          <img src={listing.images[0]} alt="" loading="lazy" />
        ) : (
          <div className="feed-card-placeholder">
            <i className="ri-image-line" aria-hidden />
          </div>
        )}
      </div>
      <div className="search-list-body">
        <div className="search-list-title">{listing.title}</div>
        <div className="search-list-location">
          {listing.location || listing.category || 'Listing'}
        </div>
        <div className="search-list-price">
          {formatListingPriceValue(listing.estimated_value)}
        </div>
        {chips.length === 0 ? (
          <div className="search-wish-empty">No wishlist</div>
        ) : (
          <div className="search-wish-chips">
            {chips.map((label) => (
              <span key={label} className="search-wish-chip">
                {label}
              </span>
            ))}
            {extra > 0 && <span className="search-wish-chip">+{extra}</span>}
          </div>
        )}
      </div>
    </Link>
  )
}

function SearchGridCard({ listing, tall }: { listing: Listing; tall: boolean }) {
  return (
    <Link to={`/listings/${listing.id}`} className={`feed-card${tall ? ' tall' : ''}`}>
      <div className="feed-card-media">
        {listing.images[0] ? (
          <img src={listing.images[0]} alt="" loading="lazy" />
        ) : (
          <div className="feed-card-placeholder">
            <i className="ri-image-line" aria-hidden />
          </div>
        )}
      </div>
      <div className="feed-card-body">
        <div className="feed-card-title">{listing.title}</div>
        <div className="feed-card-meta">
          <span>{listing.location || listing.category || 'Listing'}</span>
          <span className="feed-card-price">
            {formatListingPriceValue(listing.estimated_value)}
          </span>
        </div>
      </div>
    </Link>
  )
}

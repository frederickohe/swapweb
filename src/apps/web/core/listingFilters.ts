import type { Listing } from './models'

export interface ListingFilters {
  condition: string | null
  category: string | null
  minPrice: number
  maxPrice: number
  location: string
}

export const EMPTY_LISTING_FILTERS: ListingFilters = {
  condition: null,
  category: null,
  minPrice: 0,
  maxPrice: 0,
  location: '',
}

export function hasActiveFilters(filters: ListingFilters | null | undefined): boolean {
  if (!filters) return false
  return (
    !!filters.condition ||
    !!filters.category ||
    filters.minPrice > 0 ||
    filters.maxPrice > 0 ||
    !!filters.location.trim()
  )
}

export function matchesListingFilters(
  listing: Listing,
  filters: ListingFilters | null | undefined,
  keyword = '',
): boolean {
  const q = keyword.trim().toLowerCase()
  if (q) {
    const haystack = [
      listing.title,
      listing.category,
      listing.condition,
      listing.estimated_value?.toString() ?? '',
    ]
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(q)) return false
  }

  if (!filters) return true

  if (filters.category && listing.category.trim() !== filters.category) {
    return false
  }

  if (filters.condition && listing.condition.trim() !== filters.condition) {
    return false
  }

  if (filters.minPrice > 0 || filters.maxPrice > 0) {
    const price = listing.estimated_value
    if (price == null) return false
    if (filters.minPrice > 0 && price < filters.minPrice) return false
    if (filters.maxPrice > 0 && price > filters.maxPrice) return false
  }

  const location = filters.location.trim().toLowerCase()
  if (location && !listing.location.toLowerCase().includes(location)) {
    return false
  }

  return true
}

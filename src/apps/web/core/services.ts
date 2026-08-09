import { apiFormRequest, apiRequest } from './apiClient'
import {
  normalizeListing,
  normalizeMeetupDetails,
  normalizeNotification,
  normalizeSwapRequest,
  normalizeUser,
  type AppNotification,
  type CreateListingRequest,
  type Listing,
  type ListingSearchResponse,
  type LoginRequest,
  type MeetupDetails,
  type SignupRequest,
  type SwapRequest,
  type UpdateProfileRequest,
  type UserProfile,
} from './models'
import { storage } from './utils/storage'

interface SigninResponse {
  access_token: string
  refresh_token?: string
  token_type?: string
  expires_in?: number
  status?: string
}

function extractItems(body: unknown): unknown[] {
  if (Array.isArray(body)) return body
  if (body && typeof body === 'object') {
    const r = body as Record<string, unknown>
    if (Array.isArray(r.items)) return r.items
    if (Array.isArray(r.notifications)) return r.notifications
    if (Array.isArray(r.results)) return r.results
    if (Array.isArray(r.data)) return r.data
    if (r.data && typeof r.data === 'object') {
      const data = r.data as Record<string, unknown>
      if (Array.isArray(data.items)) return data.items
      if (Array.isArray(data.notifications)) return data.notifications
    }
  }
  return []
}

export const authApi = {
  async login(payload: LoginRequest): Promise<{ token: string; user: UserProfile }> {
    const tokens = await apiRequest<SigninResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email,
        username: payload.email,
        password: payload.password,
      }),
    })

    storage.setItem('token', tokens.access_token)
    if (tokens.refresh_token) {
      storage.setItem('refresh_token', tokens.refresh_token)
    }

    const me = await apiRequest<Record<string, unknown>>('/user/me')
    const user = normalizeUser(me)
    storage.setJson('user', user)

    return { token: tokens.access_token, user }
  },

  async signup(payload: SignupRequest): Promise<void> {
    await apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        fullname: payload.fullname,
        email: payload.email,
        password: payload.password,
        ...(payload.phone?.trim() ? { phone: payload.phone.trim() } : {}),
      }),
    })
  },

  async me(): Promise<UserProfile> {
    const me = await apiRequest<Record<string, unknown>>('/user/me')
    return normalizeUser(me)
  },

  async logout(): Promise<void> {
    try {
      await apiRequest('/auth/signout', { method: 'POST' })
    } catch {
      // best effort
    }
  },

  async updateProfile(payload: UpdateProfileRequest): Promise<UserProfile> {
    const body: Record<string, unknown> = {}
    const set = (key: keyof UpdateProfileRequest, out = key as string) => {
      if (payload[key] !== undefined) body[out] = payload[key]
    }
    set('fullname')
    set('phone')
    set('ghana_card')
    set('nationality')
    set('date_of_birth')
    set('gender')
    set('staff_id')
    set('company')
    set('current_branch')
    set('address')
    set('location')
    set('whatsapp_number')
    set('facebook_url')
    set('linkedin_url')
    set('twitter_url')
    set('instagram_url')

    const me = await apiRequest<Record<string, unknown>>('/user/me', {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    const user = normalizeUser(me)
    storage.setJson('user', user)
    return user
  },

  async uploadProfileImage(file: File): Promise<UserProfile> {
    const form = new FormData()
    form.append('files', file)
    const uploaded = await apiFormRequest<unknown>('/storage/me/upload-multiple', form, {
      params: { folder: 'profile-images' },
    })

    let fileUrl = ''
    if (Array.isArray(uploaded) && uploaded[0] && typeof uploaded[0] === 'object') {
      const first = uploaded[0] as Record<string, unknown>
      fileUrl = String(first.file_url ?? first.url ?? '')
    } else if (uploaded && typeof uploaded === 'object') {
      const rec = uploaded as Record<string, unknown>
      fileUrl = String(rec.file_url ?? rec.url ?? '')
    }
    if (!fileUrl) throw new Error('Upload succeeded but no file URL was returned')

    const me = await apiRequest<Record<string, unknown>>('/user/me/profile-image', {
      method: 'PATCH',
      body: JSON.stringify({ profile_picture_url: fileUrl }),
    })
    const user = normalizeUser(me)
    storage.setJson('user', user)
    return user
  },

  async resetPassword(email: string, newPassword: string): Promise<void> {
    await apiRequest('/auth/no-auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        new_password: newPassword,
      }),
    })
  },
}

export const notificationsApi = {
  async list(params?: { page?: number; size?: number; status?: string }): Promise<AppNotification[]> {
    const body = await apiRequest<unknown>('/user/me/notifications', {
      params: {
        page: params?.page ?? 1,
        size: params?.size ?? 100,
        status: params?.status,
      },
    })
    return extractItems(body).map(normalizeNotification)
  },

  async unreadCount(): Promise<number> {
    try {
      const items = await this.list({ status: 'UNREAD' })
      return items.filter((n) => !n.read).length
    } catch {
      return 0
    }
  },

  async markRead(id: string): Promise<void> {
    await apiRequest(`/notification/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    })
  },
}

export const listingsApi = {
  async search(params: {
    keyword?: string
    category?: string
    page?: number
    size?: number
  }): Promise<ListingSearchResponse> {
    const body = await apiRequest<Record<string, unknown>>('/listings/search', {
      params: {
        keyword: params.keyword,
        category: params.category,
        page: params.page ?? 1,
        size: params.size ?? 24,
      },
    })

    const items = extractItems(body).map(normalizeListing)
    return {
      items,
      total: typeof body.total === 'number' ? body.total : items.length,
      page: typeof body.page === 'number' ? body.page : (params.page ?? 1),
      size: typeof body.size === 'number' ? body.size : (params.size ?? 24),
    }
  },

  async getById(id: string): Promise<Listing> {
    const body = await apiRequest<unknown>(`/listings/${encodeURIComponent(id)}`)
    return normalizeListing(body)
  },

  async mine(status?: string): Promise<Listing[]> {
    const body = await apiRequest<unknown>('/listings/mine', {
      params: status ? { status } : undefined,
    })
    return extractItems(body).map(normalizeListing)
  },

  async uploadImage(file: File): Promise<string> {
    const form = new FormData()
    form.append('file', file)
    const uploaded = await apiFormRequest<Record<string, unknown>>('/storage/upload', form, {
      params: { folder: 'listings' },
    })
    const url = String(uploaded.file_url ?? uploaded.url ?? '')
    if (!url) throw new Error('Upload succeeded but no file URL was returned')
    return url
  },

  async create(payload: CreateListingRequest): Promise<Listing> {
    const body = await apiRequest<unknown>('/listings', {
      method: 'POST',
      body: JSON.stringify({
        title: payload.title,
        description: payload.description,
        category: payload.category,
        condition: payload.condition,
        estimated_value: payload.estimated_value,
        primary_image_url: payload.primary_image_url,
        image_urls: payload.image_urls ?? [payload.primary_image_url],
        ownership_documents_available: payload.ownership_documents_available ?? false,
        wishlist: payload.wishlist ?? [],
        wish_finding: payload.wish_finding ?? false,
        budget_negotiation: payload.budget_negotiation ?? false,
        collection_assistance: payload.collection_assistance ?? false,
        ...(payload.serial_number?.trim()
          ? { serial_number: payload.serial_number.trim() }
          : {}),
        ...(payload.build_version?.trim()
          ? { build_version: payload.build_version.trim() }
          : {}),
        ...(payload.budget_negotiation && payload.budget_amount != null
          ? { budget_amount: payload.budget_amount }
          : {}),
        ...(payload.location_lat != null ? { location_lat: payload.location_lat } : {}),
        ...(payload.location_lng != null ? { location_lng: payload.location_lng } : {}),
        ...(payload.location_area?.trim()
          ? { location_area: payload.location_area.trim() }
          : {}),
      }),
    })
    return normalizeListing(body)
  },
}

export const swapsApi = {
  async listRequests(role: 'all' | 'initiator' | 'owner' = 'all'): Promise<SwapRequest[]> {
    const body = await apiRequest<unknown>('/swaps/requests', {
      params: { role },
    })
    const user = storage.getJson<UserProfile>('user')
    return extractItems(body).map((item) => normalizeSwapRequest(item, user?.id))
  },

  async createRequest(ownerListingId: string, initiatorListingId: string) {
    return apiRequest('/swaps/requests', {
      method: 'POST',
      body: JSON.stringify({
        owner_listing_id: ownerListingId,
        initiator_listing_id: initiatorListingId,
      }),
    })
  },

  async approve(id: string) {
    return apiRequest(`/swaps/requests/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
    })
  },

  async reject(id: string) {
    return apiRequest(`/swaps/requests/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
    })
  },

  async cancel(id: string) {
    return apiRequest(`/swaps/requests/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    })
  },

  async complete(id: string) {
    return apiRequest(`/swaps/requests/${encodeURIComponent(id)}/complete`, {
      method: 'POST',
    })
  },

  async meetupDetails(id: string): Promise<MeetupDetails> {
    const body = await apiRequest<unknown>(
      `/swaps/requests/${encodeURIComponent(id)}/meetup-details`,
    )
    return normalizeMeetupDetails(body)
  },

  async startInitiatorFee(id: string): Promise<{
    authorizationUrl: string
    reference: string
  }> {
    const body = await apiRequest<Record<string, unknown>>(
      `/swaps/requests/${encodeURIComponent(id)}/initiator-fee`,
      { method: 'POST' },
    )
    const payment =
      body.payment && typeof body.payment === 'object'
        ? (body.payment as Record<string, unknown>)
        : body
    const authorizationUrl = String(
      payment.authorization_url ?? payment.authorizationUrl ?? '',
    ).trim()
    const reference = String(payment.reference ?? body.reference ?? '').trim()
    if (!authorizationUrl || !reference) {
      throw new Error('Could not start payment checkout')
    }
    return { authorizationUrl, reference }
  },

  async confirmInitiatorFee(reference: string) {
    return apiRequest('/swaps/requests/confirm-initiator-fee', {
      method: 'POST',
      body: JSON.stringify({ reference }),
    })
  },
}

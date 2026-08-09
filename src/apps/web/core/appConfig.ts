import { API_BASE_URL } from '../../../config/env'

export interface RuntimeConfig {
  apiBaseUrl: string
  /** Geoapify key for map tiles + reverse geocode (optional). */
  geoapifyApiKey: string
}

const defaultApiBase = API_BASE_URL.endsWith('/api/v1')
  ? API_BASE_URL
  : `${API_BASE_URL.replace(/\/$/, '')}/api/v1`

const envGeoKey =
  (typeof import.meta.env.VITE_GEOAPIFY_API_KEY === 'string'
    ? import.meta.env.VITE_GEOAPIFY_API_KEY
    : ''
  ).trim()

let config: RuntimeConfig = {
  apiBaseUrl: defaultApiBase,
  geoapifyApiKey: envGeoKey,
}

export function getAppConfig(): RuntimeConfig {
  return config
}

export function hasGeoapifyApiKey(): boolean {
  return config.geoapifyApiKey.trim().length > 0
}

export async function loadAppConfig(): Promise<void> {
  try {
    const response = await fetch('/config.json', { cache: 'no-store' })
    if (response.ok) {
      const json = (await response.json()) as Partial<RuntimeConfig>
      // In dev, keep the env/proxy API URL — config.json targets production and
      // would bypass the Vite proxy if it overwrote apiBaseUrl.
      if (import.meta.env.DEV) {
        const { apiBaseUrl: _ignored, ...runtimeOnly } = json
        config = { ...config, ...runtimeOnly }
      } else {
        config = { ...config, ...json }
      }
      if (!config.geoapifyApiKey.trim() && envGeoKey) {
        config.geoapifyApiKey = envGeoKey
      }
    }
  } catch {
    // optional runtime config
  }
}

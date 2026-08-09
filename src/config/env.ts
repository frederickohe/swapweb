// In Vite dev, use the local proxy (/api → api.swappro.store) so real browsers
// don't hit cross-origin CORS the way the Cursor Simple Browser often ignores.
export const API_BASE_URL = import.meta.env.DEV
  ? '/api/v1'
  : (import.meta.env.VITE_API_BASE_URL ?? 'https://api.swappro.store/api/v1')

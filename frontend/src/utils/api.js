export function getApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_BASE_URL || '').trim()
  if (!raw) return ''
  return raw.replace(/\/$/, '')
}

export function buildApiUrl(path) {
  if (!path) return path
  if (/^https?:\/\//i.test(path)) return path
  const base = getApiBaseUrl()
  if (!base) return path
  if (path.startsWith('/')) return `${base}${path}`
  return `${base}/${path}`
}

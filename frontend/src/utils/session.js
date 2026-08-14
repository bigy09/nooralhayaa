const SESSION_KEY = 'app-assata-session-id'

function generateSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export function getSessionId() {
  if (typeof window === 'undefined' || !window.localStorage) return 'default'

  let sessionId = window.localStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = generateSessionId()
    window.localStorage.setItem(SESSION_KEY, sessionId)
  }

  return sessionId
}

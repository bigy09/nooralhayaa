import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { buildApiUrl } from '../utils/api'
import { getSessionId } from '../utils/session'

const AuthContext = createContext(null)

const USER_TOKEN_KEY = 'userToken'
const ADMIN_TOKEN_KEY = 'adminToken'

function parseError(payload, fallback) {
  if (!payload) return fallback
  if (typeof payload === 'string') return payload
  if (payload.error) return payload.error
  return fallback
}

export function AuthProvider({ children }) {
  const storage = typeof globalThis !== 'undefined' ? globalThis.localStorage : null
  const [userToken, setUserToken] = useState(storage?.getItem(USER_TOKEN_KEY) || '')
  const [adminToken, setAdminToken] = useState(storage?.getItem(ADMIN_TOKEN_KEY) || '')
  const [user, setUser] = useState(null)
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  const activeToken = adminToken || userToken

  const clearUserAuth = useCallback(() => {
    storage?.removeItem(USER_TOKEN_KEY)
    setUserToken('')
    setUser(null)
  }, [storage])

  const clearAdminAuth = useCallback(() => {
    storage?.removeItem(ADMIN_TOKEN_KEY)
    setAdminToken('')
    setAdmin(null)
  }, [storage])

  const storeUserAuth = useCallback((payload) => {
    if (!payload?.token) return
    storage?.setItem(USER_TOKEN_KEY, payload.token)
    setUserToken(payload.token)
    setUser(payload.user)
    clearAdminAuth()
  }, [clearAdminAuth, storage])

  const storeAdminAuth = useCallback((payload) => {
    if (!payload?.token) return
    storage?.setItem(ADMIN_TOKEN_KEY, payload.token)
    setAdminToken(payload.token)
    setAdmin(payload.user)
    clearUserAuth()
  }, [clearUserAuth, storage])

  const storeAuth = useCallback((payload) => {
    if (!payload?.token) return
    const role = payload?.user?.role || (payload?.isAdmin ? 'admin' : 'user')

    if (role === 'admin') {
      storeAdminAuth(payload)
    } else {
      storeUserAuth(payload)
    }
  }, [storeAdminAuth, storeUserAuth])

  const updateUser = useCallback((updatedUser) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUser } : updatedUser))
  }, [])

  const requestJson = useCallback(async (url, options = {}, token = '') => {
    const headers = {
      ...(options.headers || {}),
      'x-session-id': getSessionId(),
    }

    if (token) headers.Authorization = `Bearer ${token}`

    const response = await globalThis.fetch(buildApiUrl(url), { ...options, headers, credentials: 'include' })
    let payload = { error: `HTTP ${response.status} ${response.statusText}`.trim() }
    try {
      payload = await response.json()
    } catch {
      // keep fallback error payload
    }

    return { response, payload }
  }, [])

  const refreshForRole = useCallback(async (role) => {
    const { response, payload } = await requestJson('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })

    if (!response.ok || !payload?.token) {
      if (role === 'admin') clearAdminAuth()
      else clearUserAuth()
      return null
    }

    storeAuth(payload)
    return payload.token
  }, [clearAdminAuth, clearUserAuth, requestJson, storeAuth])

  const authFetch = useCallback(async (url, options = {}, tokenOverride = null) => {
    const requestedToken = tokenOverride || activeToken
    const firstTry = await requestJson(url, options, requestedToken)

    if (firstTry.response.ok) return firstTry.payload

    if (firstTry.response.status === 401 && !tokenOverride) {
      const role = adminToken ? 'admin' : userToken ? 'user' : null
      if (role) {
        const nextToken = await refreshForRole(role)
        if (nextToken) {
          const secondTry = await requestJson(url, options, nextToken)
          if (secondTry.response.ok) return secondTry.payload
          throw new Error(parseError(secondTry.payload, 'Request failed'))
        }
      }
    }

    throw new Error(parseError(firstTry.payload, 'Request failed'))
  }, [activeToken, adminToken, refreshForRole, requestJson, userToken])

  const hydrate = useCallback(async () => {
    setLoading(true)
    try {
      if (adminToken) {
        let me = null
        try {
          me = await authFetch('/api/auth/me', {}, adminToken)
        } catch {
          const refreshed = await refreshForRole('admin')
          if (refreshed) me = await authFetch('/api/auth/me', {}, refreshed)
        }

        if (me?.role === 'admin') {
          setAdmin(me)
        } else {
          clearAdminAuth()
        }
      }

      if (userToken) {
        let me = null
        try {
          me = await authFetch('/api/auth/me', {}, userToken)
        } catch {
          const refreshed = await refreshForRole('user')
          if (refreshed) me = await authFetch('/api/auth/me', {}, refreshed)
        }

        if (me?.role === 'user') {
          setUser(me)
        } else {
          clearUserAuth()
        }
      }
    } catch (error) {
      if (adminToken) clearAdminAuth()
      if (userToken) clearUserAuth()
      console.debug('hydrate failed', error)
    } finally {
      setLoading(false)
    }
  }, [adminToken, authFetch, clearAdminAuth, clearUserAuth, refreshForRole, userToken])

  useEffect(() => {
    async function initialize() {
      await hydrate()
    }
    void initialize()
  }, [hydrate])

  const register = useCallback(async ({ name, email, password, preferredLocation }) => {
    const payload = await authFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, preferredLocation }),
    }, '')

    storeAuth(payload)
    return payload
  }, [authFetch, storeAuth])

  const login = useCallback(async ({ email, password }) => {
    const payload = await authFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }, '')

    storeAuth(payload)
    return payload
  }, [authFetch, storeAuth])

  const logoutUser = useCallback(async () => {
    try {
      await requestJson('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user' }),
      })
    } catch (error) {
      // ignore logout errors
      console.debug('logoutUser failed', error)
    }
    clearUserAuth()
  }, [clearUserAuth, requestJson])

  const logoutAdmin = useCallback(async () => {
    try {
      await requestJson('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' }),
      })
    } catch (error) {
      // ignore logout errors
      console.debug('logoutAdmin failed', error)
    }
    clearAdminAuth()
  }, [clearAdminAuth, requestJson])

  const value = useMemo(() => ({
    user,
    admin,
    userToken,
    adminToken,
    isUserAuthenticated: Boolean(userToken && user),
    isAdminAuthenticated: Boolean(adminToken && admin),
    loading,
    authFetch,
    register,
    login,
    logoutUser,
    logoutAdmin,
    updateUser,
  }), [admin, adminToken, authFetch, loading, login, logoutAdmin, logoutUser, register, updateUser, user, userToken])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

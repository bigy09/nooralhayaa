import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { buildApiUrl } from '../utils/api'

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
  const [userToken, setUserToken] = useState(localStorage.getItem(USER_TOKEN_KEY) || '')
  const [adminToken, setAdminToken] = useState(localStorage.getItem(ADMIN_TOKEN_KEY) || '')
  const [user, setUser] = useState(null)
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  const activeToken = adminToken || userToken

  const clearUserAuth = useCallback(() => {
    localStorage.removeItem(USER_TOKEN_KEY)
    setUserToken('')
    setUser(null)
  }, [])

  const clearAdminAuth = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    setAdminToken('')
    setAdmin(null)
  }, [])

  const storeUserAuth = useCallback((payload) => {
    if (payload.token) {
      localStorage.setItem(USER_TOKEN_KEY, payload.token)
      setUserToken(payload.token)
    }
    if (payload.user) setUser(payload.user)
  }, [])

  const storeAdminAuth = useCallback((payload) => {
    if (payload.token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, payload.token)
      setAdminToken(payload.token)
    }
    if (payload.user) setAdmin(payload.user)
  }, [])

  const requestJson = useCallback(async (url, options = {}, token = '') => {
    const headers = {
      ...(options.headers || {}),
    }

    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(buildApiUrl(url), { ...options, headers, credentials: 'include' })
    let payload = null
    try {
      payload = await response.json()
    } catch (_error) {
      payload = { error: `HTTP ${response.status} ${response.statusText}`.trim() }
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

    if (role === 'admin') storeAdminAuth(payload)
    else storeUserAuth(payload)

    return payload.token
  }, [clearAdminAuth, clearUserAuth, requestJson, storeAdminAuth, storeUserAuth])

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
        } catch (_error) {
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
        } catch (_error) {
          const refreshed = await refreshForRole('user')
          if (refreshed) me = await authFetch('/api/auth/me', {}, refreshed)
        }

        if (me?.role === 'user') {
          setUser(me)
        } else {
          clearUserAuth()
        }
      }
    } catch (_error) {
      if (adminToken) clearAdminAuth()
      if (userToken) clearUserAuth()
    } finally {
      setLoading(false)
    }
  }, [adminToken, authFetch, clearAdminAuth, clearUserAuth, refreshForRole, userToken])

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const register = useCallback(async ({ email, password }) => {
    const payload = await authFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }, '')

    storeUserAuth(payload)
    return payload
  }, [authFetch, storeUserAuth])

  const login = useCallback(async ({ email, password }) => {
    const payload = await authFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }, '')

    storeUserAuth(payload)
    return payload
  }, [authFetch, storeUserAuth])

  const loginAdmin = useCallback(async ({ email, password }) => {
    const payload = await authFetch('/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }, '')

    storeAdminAuth(payload)
    return payload
  }, [authFetch, storeAdminAuth])

  const logoutUser = useCallback(async () => {
    try {
      await requestJson('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user' }),
      })
    } catch (_error) {
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
    } catch (_error) {
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
    loginAdmin,
    logoutUser,
    logoutAdmin,
  }), [admin, adminToken, authFetch, loading, login, loginAdmin, logoutAdmin, logoutUser, register, user, userToken])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

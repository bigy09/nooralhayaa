import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { buildApiUrl } from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const requestJson = useCallback(async (url, options = {}) => {
    const headers = { ...(options.headers || {}) };
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
    const response = await fetch(buildApiUrl(url), { ...options, headers, credentials: 'include' });
    const payload = await response.json();
    return { response, payload };
  }, [adminToken]);

  const refreshToken = useCallback(async () => {
    const { response, payload } = await requestJson('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' }),
    });

    if (!response.ok) {
      localStorage.removeItem('adminToken');
      setAdminToken('');
      setAdmin(null);
      return null;
    }

    if (payload.token) {
      localStorage.setItem('adminToken', payload.token);
      setAdminToken(payload.token);
      setAdmin(payload.user);
      return payload.token;
    }

    return null;
  }, [requestJson]);

  function toError(result) {
    const error = new Error(result.payload?.error || 'Request failed');
    error.status = result.response.status;
    // Expose champs additionnels du payload (ex: productCount sur un 409 catégorie)
    // pour que l'appelant puisse réagir sans reparser la réponse.
    Object.assign(error, result.payload);
    return error;
  }

  const authFetch = useCallback(async (url, options = {}) => {
    const result = await requestJson(url, options);
    if (result.response.ok) return result.payload;

    if (result.response.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        const retry = await requestJson(url, options);
        if (retry.response.ok) return retry.payload;
        throw toError(retry);
      }
    }

    throw toError(result);
  }, [refreshToken, requestJson]);

  const hydrate = useCallback(async () => {
    if (!adminToken) {
      setLoading(false);
      return;
    }

    try {
      const { response, payload } = await requestJson('/api/auth/me');
      if (response.ok && payload.role === 'admin') {
        setAdmin(payload);
      } else {
        await refreshToken();
      }
    } catch (_error) {
      await refreshToken();
    } finally {
      setLoading(false);
    }
  }, [adminToken, refreshToken, requestJson]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const loginAdmin = useCallback(async ({ email, password }) => {
    const { response, payload } = await requestJson('/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) throw new Error(payload.error || 'Login failed');

    localStorage.setItem('adminToken', payload.token);
    setAdminToken(payload.token);
    setAdmin(payload.user);
    return payload;
  }, [requestJson]);

  const logoutAdmin = useCallback(async () => {
    try {
      await requestJson('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (_error) {
    }
    localStorage.removeItem('adminToken');
    setAdminToken('');
    setAdmin(null);
  }, [requestJson]);

  return (
    <AuthContext.Provider value={{ admin, adminToken, authFetch, loginAdmin, logoutAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

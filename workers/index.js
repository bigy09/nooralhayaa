import { getFromR2, uploadToR2 } from './r2-helper.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Upload endpoint: POST raw body to R2. Frontend should send the file bytes
    // with header `x-filename` set to the desired key.
    if (url.pathname === '/api/uploads' && request.method === 'POST') {
      const filename = request.headers.get('x-filename') || `upload-${Date.now()}`;
      const contentType = request.headers.get('content-type') || 'application/octet-stream';
      const buffer = await request.arrayBuffer();
      await uploadToR2(env.UPLOADS, filename, buffer, contentType);
      const publicUrl = `${new URL(request.url).origin}/uploads/${filename}`;
      return new Response(JSON.stringify({ ok: true, url: publicUrl }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    // Serve uploads from R2 if path matches
    if (url.pathname.startsWith('/uploads/')) {
      const key = url.pathname.replace(/^\/uploads\//, '');
      const resp = await getFromR2(env.UPLOADS, key);
      if (!resp) return new Response('Not found', { status: 404 });
      return resp;
    }

    // Proxy API requests to a backend service (or handle in-worker)
    if (url.pathname.startsWith('/api')) {
      const backend = env.BACKEND_URL || '';
      if (!backend) {
        return new Response(JSON.stringify({ error: 'BACKEND_URL not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }

      const backendUrl = new URL(backend);
      backendUrl.pathname = url.pathname;
      backendUrl.search = url.search;

      // Forward headers but remove host to avoid CORS issues
      const headers = new Headers(request.headers);
      headers.set('x-forwarded-host', request.headers.get('host') || '');

      const upstreamResponse = await fetch(backendUrl.toString(), {
        method: request.method,
        headers,
        body: request.body
      });
      return upstreamResponse;
    }

    // Default placeholder
    return new Response('App Assata Worker scaffold — nothing to serve here.', { status: 200 });
  }
}
// Worker scaffold — minimal example using Cloudflare Workers
import data from './data.json' assert { type: 'json' }
import { SignJWT, jwtVerify } from 'jose'

const encoder = new TextEncoder()

function toJson(res, status = 200) {
  return new Response(JSON.stringify(res), { status, headers: { 'Content-Type': 'application/json' } })
}

async function sha256hex(input) {
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function getSecret(name) {
  // Avoid ReferenceError if secret not bound; prefer globalThis access
  try {
    if (typeof globalThis[name] !== 'undefined') return String(globalThis[name])
  } catch (_) {}
  return process?.env?.[name] || ''
}

const JWT_SECRET = getSecret('JWT_SECRET') || 'dev-secret'
const JWT_REFRESH_SECRET = getSecret('JWT_REFRESH_SECRET') || JWT_SECRET

// In-memory refresh sessions map (sid -> { email, expiresAt })
const refreshStore = new Map()

addEventListener('fetch', (event) => {
  event.respondWith(handle(event.request))
})

async function issueAccessToken(user) {
  const alg = 'HS256'
  const payload = { sub: user.email, role: user.role }
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encoder.encode(JWT_SECRET))
  return jwt
}

async function issueRefreshToken(email) {
  const alg = 'HS256'
  const sid = Math.random().toString(36).slice(2)
  const token = await new SignJWT({ sub: email, sid, type: 'refresh' })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(encoder.encode(JWT_REFRESH_SECRET))
  const decodedExp = nowSeconds() + 30 * 24 * 60 * 60
  refreshStore.set(sid, { email, expiresAt: decodedExp })
  return token
}

async function verifyRefreshToken(token) {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(JWT_REFRESH_SECRET))
    if (payload.type !== 'refresh' || !payload.sid) throw new Error('invalid')
    const sid = payload.sid
    const entry = refreshStore.get(sid)
    if (!entry || entry.email !== payload.sub) throw new Error('not found')
    if (entry.expiresAt <= nowSeconds()) {
      refreshStore.delete(sid)
      throw new Error('expired')
    }
    return payload
  } catch (err) {
    throw err
  }
}

async function handle(request) {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/+$/, '') || '/'

  // GET /api/products
  if (path === '/api/products' && request.method === 'GET') {
    return toJson({ ok: true, products: data.products })
  }

  // GET /api/products/:id
  const prodMatch = path.match(/^\/api\/products\/(.+)$/)
  if (prodMatch && request.method === 'GET') {
    const id = prodMatch[1]
    const p = data.products.find((x) => x._id === id)
    if (!p) return toJson({ error: 'Not found' }, 404)
    return toJson(p)
  }

  // POST /api/auth/register
  if (path === '/api/auth/register' && request.method === 'POST') {
    try {
      const body = await request.json()
      const email = (body.email || '').toLowerCase()
      const name = body.name || ''
      const password = body.password || ''
      if (!email || !password) return toJson({ error: 'Missing fields' }, 400)
      const existing = (data.users || []).find((u) => u.email === email)
      if (existing) return toJson({ error: 'Email already registered' }, 409)
      const passwordHash = await sha256hex(password)
      const user = { email, name, passwordHash, role: 'user' }
      data.users = data.users || []
      data.users.push(user)
      const token = await issueAccessToken(user)
      const refreshToken = await issueRefreshToken(email)
      return toJson({ token, refreshToken, user: { email: user.email, role: user.role } }, 201)
    } catch (err) {
      return toJson({ error: 'Invalid input' }, 400)
    }
  }

  // POST /api/auth/login
  if (path === '/api/auth/login' && request.method === 'POST') {
    try {
      const body = await request.json()
      const email = (body.email || '').toLowerCase()
      const password = body.password || ''
      const user = (data.users || []).find((u) => u.email === email)
      if (!user) return toJson({ error: 'Invalid credentials' }, 401)
      const ok = (await sha256hex(password)) === user.passwordHash
      if (!ok) return toJson({ error: 'Invalid credentials' }, 401)
      const token = await issueAccessToken(user)
      const refreshToken = await issueRefreshToken(email)
      return toJson({ token, refreshToken, user: { email: user.email, role: user.role } })
    } catch (err) {
      return toJson({ error: 'Invalid request' }, 400)
    }
  }

  // POST /api/auth/refresh
  if (path === '/api/auth/refresh' && request.method === 'POST') {
    try {
      const body = await request.json()
      const token = body.refreshToken
      if (!token) return toJson({ error: 'Refresh token required' }, 401)
      await verifyRefreshToken(token)
      // if valid, issue new access token
      const { payload } = await jwtVerify(token, encoder.encode(JWT_REFRESH_SECRET))
      const user = (data.users || []).find((u) => u.email === payload.sub)
      if (!user) return toJson({ error: 'User not found' }, 404)
      const access = await issueAccessToken(user)
      return toJson({ token: access })
    } catch (err) {
      return toJson({ error: 'Invalid refresh token' }, 401)
    }
  }

  if (path === '/' || path === '/api') return toJson({ ok: true, message: 'Worker API' })

  return new Response('Not Found', { status: 404 })
}

export default {
  async fetch(request) {
    return handle(request)
  }
}

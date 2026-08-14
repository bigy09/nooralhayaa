import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';
import { User } from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  })
  .refine((payload) => payload.currentPassword !== payload.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

const refreshSchema = z.object({
  role: z.enum(['admin']).optional(),
});

function buildAccessToken(user) {
  return jwt.sign({ sub: String(user._id), email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

function buildRefreshToken(user, sid) {
  return jwt.sign({ sub: String(user._id), role: user.role, sid, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function parseCookieHeader(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const idx = pair.indexOf('=');
      if (idx < 0) return acc;
      const key = pair.slice(0, idx).trim();
      const value = decodeURIComponent(pair.slice(idx + 1).trim());
      acc[key] = value;
      return acc;
    }, {});
}

router.post('/admin/login', async (req, res) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await User.findOne({ email: payload.email, role: 'admin' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const sid = randomBytes(24).toString('hex');
    const refreshToken = buildRefreshToken(user, sid);

    user.refreshSessions.push({
      sid,
      tokenHash: hashToken(refreshToken),
      role: user.role,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await user.save();

    res.cookie('admin_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    return res.json({ token: buildAccessToken(user), user: { email: user.email, role: user.role } });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const payload = refreshSchema.parse(req.body || {});
    const cookies = parseCookieHeader(req.headers.cookie || '');
    const refreshToken = cookies.admin_refresh_token;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh' || !decoded.sid) return res.status(401).json({ error: 'Invalid refresh token' });

    const user = await User.findById(decoded.sub);
    if (!user || user.role !== decoded.role) return res.status(401).json({ error: 'Invalid refresh token' });

    const session = user.refreshSessions.find((item) => item.sid === decoded.sid);
    if (!session || session.tokenHash !== hashToken(refreshToken) || new Date(session.expiresAt) <= new Date()) {
      return res.status(401).json({ error: 'Refresh token expired or invalid' });
    }

    const nextSid = randomBytes(24).toString('hex');
    const nextRefreshToken = buildRefreshToken(user, nextSid);
    user.refreshSessions = user.refreshSessions.filter((item) => item.sid !== decoded.sid);
    user.refreshSessions.push({
      sid: nextSid,
      tokenHash: hashToken(nextRefreshToken),
      role: user.role,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await user.save();

    res.cookie('admin_refresh_token', nextRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    return res.json({ token: buildAccessToken(user), user: { email: user.email, role: user.role } });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const cookies = parseCookieHeader(req.headers.cookie || '');
    const refreshToken = cookies.admin_refresh_token;
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, { ignoreExpiration: true });
        await User.updateOne({ _id: decoded.sub }, { $pull: { refreshSessions: { sid: decoded.sid } } });
      } catch (_error) {
      }
    }

    res.clearCookie('admin_refresh_token', { path: '/api/auth' });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const payload = changePasswordSchema.parse(req.body);
    const user = await User.findById(req.auth.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ok = await bcrypt.compare(payload.currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

    user.passwordHash = await bcrypt.hash(payload.newPassword, 12);
    user.refreshSessions = [];
    await user.save();
    res.clearCookie('admin_refresh_token', { path: '/api/auth' });

    return res.json({ ok: true, message: 'Password updated. Please login again.' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    return res.status(500).json({ error: error.message });
  }
});

router.get('/me', async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication token is required' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ email: payload.email, role: payload.role });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;

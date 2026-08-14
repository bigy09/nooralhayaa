import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';

export function buildAccessToken(user) {
  return jwt.sign({ sub: String(user._id), email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

export function buildRefreshToken(user, sid) {
  return jwt.sign({ sub: String(user._id), role: user.role, sid, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function createSid() {
  return randomBytes(24).toString('hex');
}

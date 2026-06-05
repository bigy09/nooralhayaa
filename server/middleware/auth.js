import jwt from 'jsonwebtoken';

export function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token is required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.auth || req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}

export function requireUser(req, res, next) {
  if (!req.auth || req.auth.role !== 'user') {
    return res.status(403).json({ error: 'User access required' });
  }
  return next();
}

import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import mongoose from 'mongoose';
import { z } from 'zod';
import { verifyToken, requireAdmin, requireUser } from './middleware/auth.js';
import { AuditLog } from './models/AuditLog.js';
import { Banner } from './models/Banner.js';
import { Cart } from './models/Cart.js';
import { Category } from './models/Category.js';
import { Order } from './models/Order.js';
import { Product } from './models/Product.js';
import { User } from './models/User.js';
import { Wishlist } from './models/Wishlist.js';
import EmailService from './services/EmailService.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const USER_REFRESH_COOKIE = 'user_refresh_token';
const ADMIN_REFRESH_COOKIE = 'admin_refresh_token';
const isProduction = process.env.NODE_ENV === 'production';

if (!JWT_SECRET) {
  console.error('❌ Missing JWT_SECRET in environment variables');
  process.exit(1);
}

if (!process.env.JWT_REFRESH_SECRET) {
  console.warn('⚠️ JWT_REFRESH_SECRET is not set, fallback to JWT_SECRET is being used');
}

const corsWhitelist = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (corsWhitelist.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests, please try again later.' },
});

const emailService = new EmailService(
  process.env.EMAIL_USER,
  process.env.EMAIL_PASSWORD,
  process.env.ADMIN_EMAIL || process.env.EMAIL_USER
);

const paymentDirectory = {
  wave: { label: 'Wave', number: '0702396063', operator: 'Wave' },
  moov: { label: 'Moov Money', number: '0161136379', operator: 'Moov' },
  mtn: { label: 'MTN Money', number: '0500838940', operator: 'MTN' },
  orange: { label: 'Orange Money', number: '0716557419', operator: 'Orange' },
};

const registerSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20).optional(),
  role: z.enum(['user', 'admin']).optional(),
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

const orderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        name: z.string(),
        price: z.number().nonnegative(),
        size: z.string().optional(),
        quantity: z.number().int().positive(),
        image: z.string().optional(),
        background: z.string().optional(),
      })
    )
    .min(1),
  customer: z.object({
    name: z.string().min(2),
    phone: z.string().min(8),
    address: z.string().min(3),
  }),
  paymentMethod: z.enum(['wave', 'moov', 'mtn', 'orange']),
  total: z.number().nonnegative(),
  subtotal: z.number().nonnegative().optional(),
  shipping: z.number().nonnegative().optional(),
});

const adminProductSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  categorySlug: z.string().min(2),
  inventory: z.number().int().nonnegative().default(0),
  isVisible: z.boolean().default(true),
  isOutOfStock: z.boolean().default(false),
  images: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  rating: z.number().min(0).max(5).default(0),
  sizes: z.array(z.string()).default([]),
  swatches: z.array(z.object({ name: z.string(), color: z.string() })).default([]),
});

function buildAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function buildRefreshToken(user, sid) {
  return jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
      role: user.role,
      sid,
      type: 'refresh',
    },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
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

function getRefreshCookieName(role) {
  return role === 'admin' ? ADMIN_REFRESH_COOKIE : USER_REFRESH_COOKIE;
}

function setRefreshCookie(res, role, refreshToken) {
  res.cookie(getRefreshCookieName(role), refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res, role) {
  res.clearCookie(getRefreshCookieName(role), {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/auth',
  });
}

function pickRefreshTokenFromRequest(req, roleHint, explicitToken) {
  if (explicitToken) return explicitToken;
  const cookies = parseCookieHeader(req.headers.cookie || '');
  if (roleHint) return cookies[getRefreshCookieName(roleHint)] || null;
  return cookies[ADMIN_REFRESH_COOKIE] || cookies[USER_REFRESH_COOKIE] || null;
}

function getRequestIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) return forwarded[0] || '';
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() || '';
  return req.ip || '';
}

async function logAdminAction(req, action, targetType, targetId, metadata = {}) {
  try {
    await AuditLog.create({
      actorId: req.auth.sub,
      actorEmail: req.auth.email,
      actorRole: 'admin',
      action,
      targetType,
      targetId: String(targetId),
      metadata,
      ip: getRequestIp(req),
      userAgent: req.headers['user-agent'] || '',
    });
  } catch (error) {
    console.warn('Audit log write failed:', error.message);
  }
}

async function issueAuthTokens(user) {
  const sid = randomBytes(24).toString('hex');
  const refreshToken = buildRefreshToken(user, sid);
  const decoded = jwt.decode(refreshToken);
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await User.updateOne(
    { _id: user._id },
    {
      $pull: {
        refreshSessions: {
          expiresAt: { $lte: new Date() },
        },
      },
    }
  );

  await User.updateOne(
    { _id: user._id },
    {
      $push: {
        refreshSessions: {
          $each: [
            {
              sid,
              tokenHash: hashToken(refreshToken),
              role: user.role,
              expiresAt,
              lastUsedAt: new Date(),
            },
          ],
          $slice: -10,
        },
      },
    }
  );

  return {
    token: buildAccessToken(user),
    refreshToken,
    user: { id: user._id, email: user.email, role: user.role },
  };
}

function generateOrderNumber() {
  return `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}

async function ensureAdminUser() {
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  if (!adminEmail || !adminPassword) return;

  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
    }
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await User.create({ email: adminEmail, passwordHash, role: 'admin' });
  console.log('✅ Admin user bootstrapped from environment variables');
}

async function getOrCreateCart(sessionId) {
  let cart = await Cart.findOne({ sessionId });
  if (!cart) {
    cart = new Cart({ sessionId, items: [], total: 0 });
    await cart.save();
  }
  return cart;
}

async function getOrCreateWishlist(sessionId) {
  let wishlist = await Wishlist.findOne({ sessionId });
  if (!wishlist) {
    wishlist = new Wishlist({ sessionId, items: [] });
    await wishlist.save();
  }
  return wishlist;
}

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/noor-al-hayaa')
  .then(async () => {
    console.log('✅ MongoDB connected');
    await ensureAdminUser();
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

if (process.env.EMAIL_USER) {
  emailService.testConnection();
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const payload = registerSchema.parse(req.body);
    const existing = await User.findOne({ email: payload.email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await User.create({ email: payload.email, passwordHash, role: 'user' });
    const authPayload = await issueAuthTokens(user);
    setRefreshCookie(res, user.role, authPayload.refreshToken);

    return res.status(201).json(authPayload);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await User.findOne({ email: payload.email, role: 'user' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(payload.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const authPayload = await issueAuthTokens(user);
    setRefreshCookie(res, user.role, authPayload.refreshToken);
    return res.json(authPayload);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/admin/login', authLimiter, async (req, res) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await User.findOne({ email: payload.email, role: 'admin' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(payload.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const authPayload = await issueAuthTokens(user);
    setRefreshCookie(res, user.role, authPayload.refreshToken);
    return res.json(authPayload);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/refresh', authLimiter, async (req, res) => {
  try {
    const { refreshToken: explicitRefreshToken, role } = refreshSchema.parse(req.body || {});
    const refreshToken = pickRefreshTokenFromRequest(req, role, explicitRefreshToken);
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token is required' });
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    if (payload.type !== 'refresh' || !payload.sid) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await User.findById(payload.sub);
    if (!user || user.role !== payload.role) {
      return res.status(401).json({ error: 'Refresh session not found' });
    }

    const session = (user.refreshSessions || []).find(
      (item) => item.sid === payload.sid && item.role === payload.role
    );

    if (!session) {
      return res.status(401).json({ error: 'Refresh session expired' });
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      user.refreshSessions = user.refreshSessions.filter((item) => item.sid !== payload.sid);
      await user.save();
      return res.status(401).json({ error: 'Refresh session expired' });
    }

    if (session.tokenHash !== hashToken(refreshToken)) {
      user.refreshSessions = user.refreshSessions.filter((item) => item.role !== payload.role);
      await user.save();
      return res.status(401).json({ error: 'Refresh token mismatch detected' });
    }

    user.refreshSessions = user.refreshSessions.filter(
      (item) => item.sid !== payload.sid && new Date(item.expiresAt).getTime() > Date.now()
    );

    const nextSid = randomBytes(24).toString('hex');
    const nextRefreshToken = buildRefreshToken(user, nextSid);
    const nextDecoded = jwt.decode(nextRefreshToken);

    user.refreshSessions.push({
      sid: nextSid,
      tokenHash: hashToken(nextRefreshToken),
      role: user.role,
      expiresAt: nextDecoded?.exp ? new Date(nextDecoded.exp * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lastUsedAt: new Date(),
    });

    if (user.refreshSessions.length > 10) {
      user.refreshSessions = user.refreshSessions.slice(-10);
    }

    await user.save();

    setRefreshCookie(res, user.role, nextRefreshToken);

    return res.json({
      token: buildAccessToken(user),
      refreshToken: nextRefreshToken,
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const { refreshToken: explicitRefreshToken, role } = refreshSchema.parse(req.body || {});
    const refreshToken = pickRefreshTokenFromRequest(req, role, explicitRefreshToken);
    if (!refreshToken) {
      clearRefreshCookie(res, 'user');
      clearRefreshCookie(res, 'admin');
      return res.json({ ok: true });
    }

    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET, { ignoreExpiration: true });

    if (payload?.sub && payload?.sid) {
      await User.updateOne(
        { _id: payload.sub },
        {
          $pull: {
            refreshSessions: {
              sid: payload.sid,
            },
          },
        }
      );
    }

    if (payload?.role === 'admin') clearRefreshCookie(res, 'admin');
    if (payload?.role === 'user') clearRefreshCookie(res, 'user');

    return res.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    clearRefreshCookie(res, 'user');
    clearRefreshCookie(res, 'admin');
    return res.json({ ok: true });
  }
});

app.post('/api/auth/logout-all', verifyToken, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.auth.sub },
      {
        $pull: {
          refreshSessions: {
            role: req.auth.role,
          },
        },
      }
    );
    clearRefreshCookie(res, req.auth.role);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.auth.sub).select('_id email role createdAt');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ id: user._id, email: user.email, role: user.role, createdAt: user.createdAt });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/change-password', verifyToken, async (req, res) => {
  try {
    const payload = changePasswordSchema.parse(req.body);
    const user = await User.findById(req.auth.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ok = await bcrypt.compare(payload.currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

    user.passwordHash = await bcrypt.hash(payload.newPassword, 12);
    user.refreshSessions = [];
    await user.save();
    clearRefreshCookie(res, user.role);

    return res.json({ ok: true, message: 'Password updated. Please login again.' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/categories', async (_req, res) => {
  try {
    const categories = await Category.find({});
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/banners', async (_req, res) => {
  try {
    const banners = await Banner.find({ active: true }).sort({ order: 1 });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { category, featured, search } = req.query;
    const query = {};

    if (category) query.categorySlug = category;
    if (featured === 'true') query.featured = true;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cart', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || 'default';
    const cart = await getOrCreateCart(sessionId);
    res.json({ items: cart.items, total: cart.total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/cart', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || 'default';
    const { items } = req.body || {};

    if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid cart format' });

    const cart = await getOrCreateCart(sessionId);
    cart.items = items
      .filter((item) => item && item.id && item.selectedSize)
      .map((item) => ({
        productId: String(item.id),
        name: item.name,
        price: item.price,
        size: item.selectedSize,
        quantity: Math.max(1, Number(item.qty) || 1),
        image: item.image,
        background: item.background,
      }));
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity || 0), 0);
    await cart.save();

    res.json({ items: cart.items, total: cart.total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/wishlist', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || 'default';
    const wishlist = await getOrCreateWishlist(sessionId);
    res.json({ items: wishlist.items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/wishlist', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || 'default';
    const { items } = req.body || {};

    if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid wishlist format' });

    const wishlist = await getOrCreateWishlist(sessionId);
    wishlist.items = items
      .filter((item) => item && item.id)
      .map((item) => ({
        productId: String(item.id),
        name: item.name,
        price: item.price,
        image: item.image,
        background: item.background,
      }));
    await wishlist.save();

    res.json({ items: wishlist.items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', verifyToken, requireUser, async (req, res) => {
  try {
    const payload = orderSchema.parse(req.body);
    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      userId: req.auth.sub,
      sessionId: req.headers['x-session-id'] || 'default',
      customer: payload.customer,
      items: payload.items,
      subtotal: payload.subtotal ?? payload.total,
      shipping: payload.shipping ?? 0,
      total: payload.total,
      paymentMethod: payload.paymentMethod,
      status: 'pending',
    });

    if (emailService) {
      emailService.sendOrderConfirmation(order).catch((err) => {
        console.warn('Email notification failed:', err.message);
      });
    }

    const paymentInfo = paymentDirectory[payload.paymentMethod] || paymentDirectory.orange;

    res.status(201).json({
      ...order.toObject(),
      paymentInfo,
      message: `Order created. Payment method: ${payload.paymentMethod}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/mine', verifyToken, requireUser, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.auth.sub }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders', verifyToken, requireUser, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.auth.sub }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/orders', verifyToken, requireAdmin, async (req, res) => {
  try {
    const status = req.query.status?.trim();
    const search = req.query.search?.trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(query),
    ]);

    res.json({ orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/orders/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const status = z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).parse(req.body.status);

    const current = await Order.findById(req.params.id).select('_id status orderNumber');
    if (!current) return res.status(404).json({ error: 'Order not found' });

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );

    await logAdminAction(req, 'order.status.updated', 'order', order._id, {
      orderNumber: order.orderNumber,
      from: current.status,
      to: status,
    });

    if (status === 'shipped' && emailService) {
      emailService.sendShipmentNotification(order).catch((err) => {
        console.warn('Shipment notification failed:', err.message);
      });
    }

    res.json(order);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/products', verifyToken, requireAdmin, async (req, res) => {
  try {
    const search = req.query.search?.trim();
    const category = req.query.category?.trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.categorySlug = category;

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(query),
    ]);

    res.json({ products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/products', verifyToken, requireAdmin, async (req, res) => {
  try {
    const payload = adminProductSchema.parse(req.body);
    const product = await Product.create(payload);

    await logAdminAction(req, 'product.created', 'product', product._id, {
      name: product.name,
      categorySlug: product.categorySlug,
      price: product.price,
    });

    res.status(201).json(product);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/products/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const payload = adminProductSchema.partial().parse(req.body);
    const before = await Product.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ error: 'Product not found' });

    const product = await Product.findByIdAndUpdate(req.params.id, payload, { new: true });

    const changedKeys = Object.keys(payload);
    const changes = changedKeys.reduce((acc, key) => {
      acc[key] = { before: before[key], after: product[key] };
      return acc;
    }, {});

    await logAdminAction(req, 'product.updated', 'product', product._id, {
      name: product.name,
      changedKeys,
      changes,
    });

    res.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stats', verifyToken, requireAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startWeek = new Date(now);
    startWeek.setDate(now.getDate() - 6);
    startWeek.setHours(0, 0, 0, 0);

    const [todayOrders, todaySalesRows, monthSalesRows, recentOrders, weeklyRows] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: startDay } }),
      Order.aggregate([{ $match: { createdAt: { $gte: startDay } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: startMonth } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.find({}).sort({ createdAt: -1 }).limit(8),
      Order.aggregate([
        { $match: { createdAt: { $gte: startWeek } } },
        {
          $group: {
            _id: {
              y: { $year: '$createdAt' },
              m: { $month: '$createdAt' },
              d: { $dayOfMonth: '$createdAt' },
            },
            sales: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
      ]),
    ]);

    const dayLabels = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      dayLabels.push({
        key: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
        label: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
      });
    }

    const weeklyMap = new Map(
      weeklyRows.map((row) => [
        `${row._id.y}-${row._id.m}-${row._id.d}`,
        { sales: row.sales, orders: row.orders, views: 0 },
      ])
    );

    const weekly = dayLabels.map((d) => ({
      day: d.label,
      ...(weeklyMap.get(d.key) || { sales: 0, orders: 0, views: 0 }),
    }));

    res.json({
      todayOrders,
      todaySales: todaySalesRows[0]?.total || 0,
      monthSales: monthSalesRows[0]?.total || 0,
      weekly,
      recentOrders,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/clients', verifyToken, requireAdmin, async (_req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('_id email createdAt').sort({ createdAt: -1 });
    const aggregates = await Order.aggregate([
      {
        $group: {
          _id: '$userId',
          ordersCount: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          lastOrderAt: { $max: '$createdAt' },
        },
      },
    ]);

    const map = new Map(aggregates.map((row) => [String(row._id), row]));
    const clients = users.map((user) => {
      const stats = map.get(String(user._id));
      return {
        id: user._id,
        email: user.email,
        createdAt: user.createdAt,
        ordersCount: stats?.ordersCount || 0,
        totalSpent: stats?.totalSpent || 0,
        lastOrderAt: stats?.lastOrderAt || null,
      };
    });

    res.json({ clients });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/discussions', verifyToken, requireAdmin, async (_req, res) => {
  try {
    const recent = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(25)
      .select('orderNumber customer paymentMethod total status createdAt');

    const discussions = recent.map((order) => ({
      id: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customer?.name,
      customerPhone: order.customer?.phone,
      customerAddress: order.customer?.address,
      total: order.total,
      paymentMethod: order.paymentMethod,
      status: order.status,
      createdAt: order.createdAt,
      whatsappLink: order.customer?.phone
        ? `https://wa.me/${String(order.customer.phone).replace(/[^0-9]/g, '')}`
        : null,
    }));

    res.json({ discussions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/analytics', verifyToken, requireAdmin, async (_req, res) => {
  try {
    const [paymentBreakdown, statusBreakdown, topProducts] = await Promise.all([
      Order.aggregate([
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, amount: { $sum: '$total' } } },
        { $sort: { amount: -1 } },
      ]),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Order.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.name',
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({ paymentBreakdown, statusBreakdown, topProducts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/audit-logs', verifyToken, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const action = req.query.action?.trim();

    const query = {};
    if (action) query.action = action;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AuditLog.countDocuments(query),
    ]);

    return res.json({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server listening on http://localhost:${port}`);
  console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
});

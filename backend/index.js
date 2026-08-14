import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { z } from 'zod';
import { verifyToken, requireAdmin, requireUser } from './middleware/auth.js';
import EmailService from './services/EmailService.js';
import { initializeDb, getDb, isUsingMock } from './db-adapter.js';
import { getDeliveryPrice } from './utils/delivery.js';

// These will be set dynamically after DB init
let User, Product, Category, Banner, Cart, Wishlist, Order, AuditLog, PageView;

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const USER_REFRESH_COOKIE = 'user_refresh_token';
const ADMIN_REFRESH_COOKIE = 'admin_refresh_token';
const isProduction = process.env.NODE_ENV === 'production';
const PAYMENT_MINIMUM = Number(process.env.PAYMENT_MINIMUM || 2020);
const CONTACT_WHATSAPP = process.env.WHATSAPP_PHONE || process.env.MERCHANT_PHONE || '2250702396063';
const INFOLINE_PHONE = process.env.INFOLINE_PHONE || CONTACT_WHATSAPP;
const PAYMENT_NUMBERS = {
  wave: process.env.WAVE_PHONE || process.env.WAVE_MERCHANT_PHONE || '2250702396063',
  orange: process.env.ORANGE_PHONE || process.env.ORANGE_MERCHANT_PHONE || '2250702396063',
  moov: process.env.MOOV_PHONE || process.env.MOOV_MERCHANT_PHONE || '2250702396063',
  mtn: process.env.MTN_PHONE || process.env.MTN_MERCHANT_PHONE || '2250702396063',
};
const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(serverDirectory, '..');
const frontendDistPath = path.join(projectRoot, 'frontend', 'dist');

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
      try {
        const url = new URL(origin);
        if (url.hostname.endsWith('.railway.app')) return callback(null, true);
        // En dev, Vite change de port automatiquement si le port par défaut est déjà
        // pris (5173 -> 5174 -> ...). Plutôt que de casser silencieusement toutes les
        // requêtes API à chaque décalage de port, on autorise tout localhost en dev.
        if (!isProduction && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
          return callback(null, true);
        }
      } catch (_error) {
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

const uploadDir = path.join(projectRoot, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-.]/g, '')}`;
      cb(null, safeName);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowedTypes.includes(file.mimetype));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.use('/uploads', express.static(uploadDir));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives d’authentification. Réessaye dans quelques minutes.' },
});

const emailService = new EmailService(
  process.env.EMAIL_USER,
  process.env.EMAIL_PASSWORD,
  process.env.ADMIN_EMAIL || process.env.EMAIL_USER
);

const paymentDirectory = {
  wave: { label: 'Wave', number: PAYMENT_NUMBERS.wave, operator: 'Wave' },
  moov: { label: 'Moov Money', number: PAYMENT_NUMBERS.moov, operator: 'Moov' },
  mtn: { label: 'MTN Money', number: PAYMENT_NUMBERS.mtn, operator: 'MTN' },
  orange: { label: 'Orange Money', number: PAYMENT_NUMBERS.orange, operator: 'Orange' },
};

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  preferredLocation: z.string().min(3).optional(),
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

const profileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  preferredLocation: z.string().min(3).optional(),
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
    email: z.string().email().optional(),
  }),
  paymentMethod: z.enum(['wave', 'moov', 'mtn', 'orange']),
  // Choix binaire obligatoire : payer la totalité, ou l'acompte fixe. Le montant
  // réel est toujours recalculé côté serveur (voir calculatePaymentDetails) —
  // total/subtotal/shipping/paymentAmount envoyés par le client ne sont plus lus.
  paymentChoice: z.enum(['full', 'deposit'], {
    errorMap: () => ({ message: 'Choisis un mode de paiement : totalité ou acompte.' }),
  }),
  transactionReference: z.string().max(128).optional(),
  deliveryZone: z.string().optional(),
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
    user: {
      id: user._id,
      name: user.name || '',
      email: user.email,
      role: user.role,
      preferredLocation: user.preferredLocation || '',
    },
  };
}

function generateOrderNumber() {
  return `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}

async function ensureAdminUser() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.warn('⚠️ ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin bootstrap. Set them in the environment to create/update the admin account.');
    return;
  }
  const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  const existing = await User.findOne({ email: adminEmail });
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  if (existing) {
    let needsSave = false;

    if (existing.role !== 'admin') {
      existing.role = 'admin';
      needsSave = true;
    }

    let passwordMatches = false;
    try {
      passwordMatches = await bcrypt.compare(adminPassword, existing.passwordHash || '');
    } catch (_error) {
      passwordMatches = false;
    }

    if (!passwordMatches) {
      existing.passwordHash = passwordHash;
      needsSave = true;
    }

    if (needsSave) {
      await existing.save();
    }

    return;
  }

  await User.create({ email: adminEmail, passwordHash, role: 'admin' });
  console.log('✅ Admin user bootstrapped from environment variables');
}

async function ensureInitialShopData() {
  const categories = [
    { name: 'Abayas & Kimonos', slug: 'kimonos', description: 'Abayas et kimonos modestes pour femme', image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80' },
    { name: 'Robes Longues', slug: 'robes', description: 'Robes longues élégantes pour toutes occasions', image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=800&q=80' },
    { name: 'Boubous & Qamis', slug: 'boubou', description: 'Tenues traditionnelles raffinées pour homme', image: 'https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=800&q=80' },
  ];

  const banners = [
    {
      title: 'Collection Noor Al Hayaa',
      subtitle: 'Une sélection élégante pour chaque occasion',
      image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=80',
      cta: { text: 'Découvrir', link: '/shop' },
      active: true,
      order: 1,
    },
    {
      title: 'Nouvelles pièces modestes',
      subtitle: 'Couleurs douces, coupes raffinées et détails artisanaux',
      image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80',
      cta: { text: 'Voir la collection', link: '/shop' },
      active: true,
      order: 2,
    },
  ];

  const products = [
    {
      name: 'Abaya Nour',
      description: 'Abaya deux pièces marine et robe bleu ciel. Tissu fluide premium, coupe élancée avec voile assorti.',
      price: 22000,
      categorySlug: 'kimonos',
      inventory: 12,
      isVisible: true,
      isOutOfStock: false,
      images: [],
      featured: true,
      rating: 4.9,
      sizes: ['S', 'M', 'L', 'XL'],
      swatches: [{ name: 'Bleu Marine', color: '#1a2d5c' }, { name: 'Noir', color: '#1a1a1a' }],
    },
    {
      name: 'Robe Safa',
      description: 'Robe longue avec manches évasées à volants papillon. Silhouette sculptante, tissu extensible confortable.',
      price: 19000,
      categorySlug: 'robes',
      inventory: 18,
      isVisible: true,
      isOutOfStock: false,
      images: [],
      featured: true,
      rating: 4.8,
      sizes: ['S', 'M', 'L', 'XL'],
      swatches: [{ name: 'Marron', color: '#6b3a1f' }, { name: 'Noir', color: '#1a1a1a' }],
    },
    {
      name: 'Kimono Haya',
      description: 'Kimono abaya camel avec drapé central élégant. Style épuré aux manches longues, ceinture assortie incluse.',
      price: 20000,
      categorySlug: 'kimonos',
      inventory: 14,
      isVisible: true,
      isOutOfStock: false,
      images: [],
      featured: true,
      rating: 4.7,
      sizes: ['S', 'M', 'L', 'XL'],
      swatches: [{ name: 'Camel', color: '#c49a6c' }, { name: 'Beige', color: '#d4b896' }],
    },
    {
      name: 'Boubou Omar',
      description: 'Grand boubou bleu marine avec broderies géométriques traditionnelles. Tissu de qualité supérieure, coupe ample royale.',
      price: 28000,
      categorySlug: 'boubou',
      inventory: 10,
      isVisible: true,
      isOutOfStock: false,
      images: [],
      featured: true,
      rating: 4.9,
      sizes: ['M', 'L', 'XL', 'XXL'],
      swatches: [{ name: 'Bleu Marine', color: '#1a2d5c' }, { name: 'Bordeaux', color: '#7a1a2e' }],
    },
    {
      name: 'Qamis Bilal',
      description: 'Qamis blanc avec broderies dorées artisanales sur le plastron. Finitions haut de gamme, parfait pour la prière et les occasions.',
      price: 25000,
      categorySlug: 'boubou',
      inventory: 16,
      isVisible: true,
      isOutOfStock: false,
      images: [],
      featured: true,
      rating: 4.8,
      sizes: ['M', 'L', 'XL', 'XXL'],
      swatches: [{ name: 'Blanc', color: '#f8f6ef' }, { name: 'Crème', color: '#f0ead0' }],
    },
  ];

  await Promise.all(categories.map((category) =>
    Category.updateOne({ slug: category.slug }, { $set: category }, { upsert: true })
  ));

  await Promise.all(banners.map((banner) =>
    Banner.updateOne({ title: banner.title }, { $set: banner }, { upsert: true })
  ));

  await Promise.all(products.map((product) =>
    Product.updateOne({ name: product.name }, { $set: product }, { upsert: true })
  ));

  console.log('✅ Shop seed data ensured');
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

(async () => {
  try {
    const usingMock = await initializeDb();
    const db = getDb();

    User = db.User;
    Product = db.Product;
    Category = db.Category;
    Banner = db.Banner;
    Cart = db.Cart;
    Wishlist = db.Wishlist;
    Order = db.Order;
    AuditLog = db.AuditLog;
    PageView = db.PageView;

    await ensureAdminUser();
    await ensureInitialShopData();

    if (usingMock) {
      console.log('⚠️ Running in Mock Database mode. Data will be reset on restart.');
    }

    if (process.env.EMAIL_USER) {
      emailService.testConnection();
    }

    app.listen(port, () => {
      console.log(`🚀 Server listening on http://localhost:${port}`);
      console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
    });
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    if (isProduction) {
      process.exit(1);
    }
  }
})();

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    mode: isUsingMock() ? 'mock' : 'mongodb',
  });
});

// Compteur de visites léger : la SPA appelle cette route à chaque changement de
// route (voir frontend/src/hooks/usePageViewTracking.js). Pas de cookie/IP
// stocké — juste un compteur agrégé par jour + par page.
async function incrementPageView(pathKey) {
  const date = new Date().toISOString().slice(0, 10);
  const normalizedPath = String(pathKey || '/').slice(0, 200);
  const existing = await PageView.findOne({ date, path: normalizedPath });
  if (existing) {
    existing.count = (existing.count || 0) + 1;
    await existing.save();
  } else {
    await PageView.create({ date, path: normalizedPath, count: 1 });
  }
}

app.post('/api/analytics/pageview', async (req, res) => {
  try {
    await incrementPageView(req.body?.path);
    res.status(204).end();
  } catch (error) {
    // Le tracking ne doit jamais faire échouer la navigation du client.
    console.warn('Page view tracking failed:', error.message);
    res.status(204).end();
  }
});

app.get('/api/config/contacts', (_req, res) => {
  res.json({
    whatsapp: CONTACT_WHATSAPP,
    infoline: INFOLINE_PHONE,
    paymentNumbers: PAYMENT_NUMBERS,
    minimumPayment: PAYMENT_MINIMUM,
  });
});

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const payload = registerSchema.parse(req.body);
    const existing = await User.findOne({ email: payload.email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await User.create({
      name: payload.name,
      email: payload.email,
      preferredLocation: payload.preferredLocation || '',
      passwordHash,
      role: 'user',
    });
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
    const user = await User.findOne({ email: payload.email });
    console.log('DEBUG: login attempt for', payload.email, 'found user?', !!user);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    try {
      const ok = await bcrypt.compare(payload.password, user.passwordHash);
      console.log('DEBUG: bcrypt.compare result for', payload.email, ok);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    } catch (err) {
      console.warn('DEBUG: bcrypt.compare threw', err && err.message);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const authPayload = await issueAuthTokens(user);
    setRefreshCookie(res, user.role, authPayload.refreshToken);
    return res.json({
      ...authPayload,
      isAdmin: user.role === 'admin',
    });
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
    // Support both mongoose models and the mock DB implementation.
    let userQuery = User.findById(req.auth.sub);
    let user;

    if (userQuery && typeof userQuery.select === 'function') {
      user = await userQuery.select('_id name email role createdAt');
    } else {
      user = await userQuery; // mock DB returns the object directly
    }

    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ id: user._id || user.id, name: user.name || '', email: user.email, role: user.role, preferredLocation: user.preferredLocation || '', createdAt: user.createdAt });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.patch('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const payload = profileUpdateSchema.parse(req.body || {});
    const user = await User.findById(req.auth.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (payload.name !== undefined) user.name = payload.name;
    if (payload.preferredLocation !== undefined) user.preferredLocation = payload.preferredLocation;

    await user.save();

    return res.json({
      id: user._id || user.id,
      name: user.name || '',
      email: user.email,
      role: user.role,
      preferredLocation: user.preferredLocation || '',
      createdAt: user.createdAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
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
    const { category, featured, search, isVisible, all } = req.query;
    const query = {};

    if (all !== 'true') {
      if (isVisible === 'false') query.isVisible = false;
      else query.isVisible = true;
    }

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

// Règle actée : deux choix exclusifs — payer la totalité, ou un acompte FIXE de
// PAYMENT_MINIMUM (2020 FCFA) quel que soit le total. Si le total est déjà
// inférieur ou égal à ce montant, l'acompte n'a pas de sens : on force le
// paiement intégral. Aucun calcul de frais de transfert par opérateur ici —
// c'est le montant que le client paie réellement, pas un tarif majoré.
function calculatePaymentDetails(total, choice) {
  const canOfferDeposit = total > PAYMENT_MINIMUM;
  const effectiveChoice = canOfferDeposit ? choice : 'full';
  const paymentAmount = effectiveChoice === 'deposit' ? PAYMENT_MINIMUM : total;
  const remainingAtDelivery = Math.max(0, total - paymentAmount);

  return {
    subtotal: total,
    paymentChoice: effectiveChoice,
    canOfferDeposit,
    depositAmount: PAYMENT_MINIMUM,
    paymentAmount,
    remainingAtDelivery,
  };
}

app.post('/api/orders/calculate-payment', async (req, res) => {
  try {
    const { total, paymentChoice } = req.body;
    if (!total) {
      return res.status(400).json({ error: 'Missing total' });
    }
    const details = calculatePaymentDetails(total, paymentChoice);
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', verifyToken, requireUser, async (req, res) => {
  try {
    const payload = orderSchema.parse(req.body);

    // Ne jamais faire confiance au prix/total envoyé par le client : on relit le prix
    // courant de chaque produit en base et on recalcule subtotal/shipping/total.
    const resolvedItems = [];
    for (const item of payload.items) {
      if (!item.productId || !mongoose.Types.ObjectId.isValid(item.productId)) {
        return res.status(400).json({ error: `Produit invalide: ${item.productId}` });
      }
      const product = await Product.findById(item.productId).select('name price images inventory isVisible');
      if (!product) return res.status(400).json({ error: `Produit introuvable: ${item.name || item.productId}` });
      const qty = Math.max(1, Number(item.quantity) || 1);
      resolvedItems.push({
        productId: item.productId,
        name: product.name,
        price: product.price,
        size: item.size,
        quantity: qty,
        image: item.image || product.images?.[0] || '',
        background: item.background,
      });
    }

    const subtotal = resolvedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = getDeliveryPrice(payload.deliveryZone || payload.customer?.address || '');
    const total = subtotal + shipping;

    const orderNumber = generateOrderNumber();
    // Choix binaire recalculé côté serveur — on ignore tout montant envoyé par le
    // client, seul son CHOIX (total/acompte) est pris en compte, et il est forcé à
    // "full" si le total ne dépasse pas le seuil de l'acompte fixe.
    const paymentDetails = calculatePaymentDetails(total, payload.paymentChoice);

    const order = await Order.create({
      orderNumber,
      userId: req.auth.sub,
      sessionId: req.headers['x-session-id'] || 'default',
      customer: payload.customer,
      items: resolvedItems,
      subtotal,
      shipping,
      deliveryZone: payload.deliveryZone || payload.customer?.address || '',
      total,
      paymentChoice: paymentDetails.paymentChoice,
      paymentAmount: paymentDetails.paymentAmount,
      remainingAtDelivery: paymentDetails.remainingAtDelivery,
      paymentMethod: payload.paymentMethod,
      status: 'pending',
      // Politique actée : le stock ne bouge qu'à la validation admin de la commande
      // (statut "confirmed"), jamais à la création — voir PUT /api/admin/orders/:id.
      inventoryReserved: false,
      paidAmount: paymentDetails.paymentAmount,
      transactionReference: payload.transactionReference,
    });

    if (emailService) {
      emailService.sendOrderConfirmation(order).catch((err) => {
        console.warn('Email notification failed:', err.message);
      });
    }

    // send customer confirmation email if email provided
    if (emailService && order.customer?.email) {
      emailService.sendCustomerOrderConfirmation(order).catch((err) => {
        console.warn('Customer confirmation email failed:', err.message);
      });
    }

    const paymentInfo = paymentDirectory[payload.paymentMethod] || paymentDirectory.orange;

    res.status(201).json({
      ...order.toObject ? order.toObject() : order,
      paymentInfo,
      paymentDetails,
      message: paymentDetails.remainingAtDelivery > 0
        ? `Commande enregistrée. Payez ${paymentDetails.paymentAmount} FCFA maintenant, le reste (${paymentDetails.remainingAtDelivery} FCFA) sera à régler à la livraison.`
        : `Commande enregistrée. Montant à payer : ${paymentDetails.paymentAmount} FCFA.`,
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

// Délai d'annulation client : 10 minutes après la création de la commande, tant
// qu'elle est encore "pending" (pas encore validée par l'admin). Vérifié ici
// côté serveur pour ne pas dépendre uniquement d'un minuteur front-end.
const CANCELLATION_WINDOW_MS = 10 * 60 * 1000;

app.post('/api/orders/:id/cancel', verifyToken, requireUser, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.auth.sub });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.status === 'cancelled') {
      return res.status(409).json({ error: 'Cette commande est déjà annulée.' });
    }
    if (order.status !== 'pending') {
      return res.status(409).json({ error: 'Cette commande ne peut plus être annulée (déjà validée par un admin).' });
    }

    const elapsed = Date.now() - new Date(order.createdAt).getTime();
    if (elapsed > CANCELLATION_WINDOW_MS) {
      return res.status(409).json({ error: "Le délai d'annulation de 10 minutes est dépassé." });
    }

    order.status = 'cancelled';
    await order.save();
    res.json(order);
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

    // notify customer by email on key status changes
    try {
      if (status === 'confirmed' && emailService && order.customer?.email) {
        emailService.sendCustomerStatusUpdate(order, 'Confirmée').catch((err) => {
          console.warn('Customer confirmation email failed:', err.message);
        });
      }

      if (status === 'shipped' && emailService && order.customer?.email) {
        emailService.sendCustomerStatusUpdate(order, 'Expédiée').catch((err) => {
          console.warn('Customer shipped email failed:', err.message);
        });
      }

      if (status === 'delivered' && emailService && order.customer?.email) {
        emailService.sendCustomerStatusUpdate(order, 'Livrée').catch((err) => {
          console.warn('Customer delivered email failed:', err.message);
        });
      }
    } catch (err) {
      console.warn('Failed to send customer status emails:', err.message);
    }

    // NOTE: cette route (ancien back office, en cours de remplacement par
    // backoffice-scaffold/backend/src/routes/admin.js) ne décrémente que le stock
    // global `inventory`, pas les stocks par variante. Pour un produit avec des
    // variantes, préfère la route équivalente du scaffold qui décrémente la bonne
    // variante et garde `inventory` synchronisé automatiquement.
    // When order is confirmed, decrement product inventory if not already reserved
    if (status === 'confirmed' && !order.inventoryReserved) {
      try {
        for (const item of order.items || []) {
          if (!item.productId) continue;
          // decrement inventory atomically
          const prod = await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { inventory: -Math.max(0, Number(item.quantity) || 0) } },
            { new: true }
          );
          if (prod) {
            // if inventory drops to 0 or below, mark as out of stock
            if ((prod.inventory || 0) <= 0) {
              await Product.findByIdAndUpdate(prod._id, { isOutOfStock: true });
            }
          }
        }
        // mark reservation so we don't double-decrement later
        await Order.findByIdAndUpdate(order._id, { inventoryReserved: true })
      } catch (err) {
        console.warn('Failed to decrement product inventory for order:', err.message);
      }
    }

    // When order is cancelled, restore reserved inventory
    if (status === 'cancelled' && order.inventoryReserved) {
      try {
        for (const item of order.items || []) {
          if (!item.productId) continue;
          const qty = Math.max(0, Number(item.quantity) || 0)
          const prod = await Product.findByIdAndUpdate(item.productId, { $inc: { inventory: qty } }, { new: true })
          if (prod && (prod.inventory || 0) > 0) {
            await Product.findByIdAndUpdate(prod._id, { isOutOfStock: false })
          }
        }
        await Order.findByIdAndUpdate(order._id, { inventoryReserved: false })
      } catch (err) {
        console.warn('Failed to restore inventory for cancelled order:', err.message)
      }
    }

    res.json(order);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    res.status(500).json({ error: error.message });
  }
});

// Get single order by id or orderNumber
app.get('/api/admin/orders/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id
    let order = null
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      order = await Order.findById(id)
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: id })
    }
    if (!order) return res.status(404).json({ error: 'Order not found' })
    res.json({ order })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

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

    const [todayOrders, todaySalesRows, monthSalesRows, recentOrders, weeklyRows, statusCounts] = await Promise.all([
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
      Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
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

    const counts = statusCounts.reduce(
      (acc, item) => ({ ...acc, [item._id]: item.count }),
      {}
    );

    res.json({
      todayOrders,
      todaySales: todaySalesRows[0]?.total || 0,
      monthSales: monthSalesRows[0]?.total || 0,
      pendingOrders: counts.pending || 0,
      inProgressOrders: (counts.confirmed || 0) + (counts.shipped || 0),
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

if (isProduction) {
  app.use(express.static(frontendDistPath));

  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}



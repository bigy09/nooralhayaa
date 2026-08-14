import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { PageView } from '../models/PageView.js';
import EmailService from '../../../../backend/services/EmailService.js';

const router = express.Router();

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(serverDirectory, '..', '..', '..', '..');
const uploadDir = path.join(projectRoot, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// URL publique sous laquelle les fichiers de /uploads sont servis. Les deux services
// (site principal et back office) partagent le même dossier disque, mais c'est le site
// principal qui est référencé par les clients pour afficher les images produit.
const ASSET_BASE_URL = (process.env.ASSET_BASE_URL || process.env.FRONTEND_API_BASE_URL || '').replace(/\/$/, '');

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

const emailService = new EmailService(
  process.env.EMAIL_USER,
  process.env.EMAIL_PASSWORD,
  process.env.ADMIN_EMAIL || process.env.EMAIL_USER
);

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

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

// ---------------------------------------------------------------------------
// Produits
// ---------------------------------------------------------------------------

const variantInputSchema = z.object({
  size: z.string().trim().nullable().optional(),
  color: z.string().trim().nullable().optional(),
  sku: z.string().trim().nullable().optional(),
  stock: z.number().int().nonnegative().default(0),
  images: z.array(z.string()).default([]),
});

const dimensionsInputSchema = z
  .object({
    length: z.number().nonnegative().optional(),
    width: z.number().nonnegative().optional(),
    height: z.number().nonnegative().optional(),
  })
  .nullable()
  .optional();

const adminProductSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  comparePrice: z.number().nonnegative().nullable().optional(),
  sku: z.string().trim().nullable().optional(),
  weight: z.number().nonnegative().nullable().optional(),
  dimensions: dimensionsInputSchema,
  // Au moins une catégorie requise (relation plusieurs-à-plusieurs).
  categories: z.array(z.string().regex(OBJECT_ID_RE, 'Identifiant de catégorie invalide')).min(1),
  inventory: z.number().int().nonnegative().default(0),
  isVisible: z.boolean().default(true),
  isOutOfStock: z.boolean().default(false),
  images: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  rating: z.number().min(0).max(5).default(0),
  sizes: z.array(z.string()).default([]),
  swatches: z.array(z.object({ name: z.string(), color: z.string() })).default([]),
  variants: z.array(variantInputSchema).default([]),
});

async function resolveCategories(categoryIds) {
  const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
  if (categories.length !== categoryIds.length) {
    const foundIds = new Set(categories.map((c) => String(c._id)));
    const missing = categoryIds.filter((id) => !foundIds.has(id));
    const error = new Error(`Catégorie(s) introuvable(s): ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
  return categories;
}

// Statistiques de vente par produit (unités vendues + chiffre d'affaires généré),
// calculées à partir des commandes non annulées. Les vues/consultations ne sont
// pas trackées à ce jour — champ volontairement omis plutôt que d'afficher un faux 0.
async function attachProductStats(products) {
  const ids = products.map((p) => String(p._id));
  if (ids.length === 0) return products;

  const rows = await Order.aggregate([
    { $match: { status: { $ne: 'cancelled' } } },
    { $unwind: '$items' },
    { $match: { 'items.productId': { $in: ids } } },
    {
      $group: {
        _id: '$items.productId',
        unitsSold: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
  ]);
  const statsById = new Map(rows.map((row) => [row._id, row]));

  return products.map((product) => {
    const stats = statsById.get(String(product._id));
    const plain = typeof product.toObject === 'function' ? product.toObject() : product;
    return {
      ...plain,
      unitsSold: stats?.unitsSold || 0,
      revenue: stats?.revenue || 0,
    };
  });
}

router.get('/products', verifyToken, requireAdmin, async (req, res) => {
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
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) {
      query.$or = [...(query.$or || []), { categorySlug: category }];
      if (OBJECT_ID_RE.test(category)) query.$or.push({ categories: category });
    }

    const [rawProducts, total] = await Promise.all([
      Product.find(query)
        .populate('categories', 'name slug')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(query),
    ]);
    const products = await attachProductStats(rawProducts);

    res.json({ products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.get('/products/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('categories', 'name slug');
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const [withStats] = await attachProductStats([product]);
    res.json(withStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/products', verifyToken, requireAdmin, async (req, res) => {
  try {
    const payload = adminProductSchema.parse(req.body);
    const categories = await resolveCategories(payload.categories);

    const product = await Product.create({
      ...payload,
      categorySlug: categories[0].slug,
    });

    await logAdminAction(req, 'product.created', 'product', product._id, {
      name: product.name,
      categories: payload.categories,
      price: product.price,
    });

    res.status(201).json(product);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.put('/products/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const payload = adminProductSchema.partial().parse(req.body);
    const before = await Product.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ error: 'Product not found' });

    if (payload.categories) {
      const categories = await resolveCategories(payload.categories);
      payload.categorySlug = categories[0].slug;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });

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
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.delete('/products/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    await logAdminAction(req, 'product.deleted', 'product', product._id, {
      name: product.name,
    });

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/uploads', verifyToken, requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (or unsupported type/size)' });
  const relativePath = `/uploads/${req.file.filename}`;
  const url = ASSET_BASE_URL ? `${ASSET_BASE_URL}${relativePath}` : relativePath;
  res.status(201).json({ url, path: relativePath });
});

// ---------------------------------------------------------------------------
// Catégories
// ---------------------------------------------------------------------------

const adminCategorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  parent: z.string().regex(OBJECT_ID_RE, 'Identifiant de catégorie parente invalide').nullable().optional(),
  order: z.number().int().default(0),
});

router.get('/categories', verifyToken, requireAdmin, async (_req, res) => {
  try {
    const categories = await Category.find({}).sort({ order: 1, name: 1 });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/categories', verifyToken, requireAdmin, async (req, res) => {
  try {
    const payload = adminCategorySchema.parse(req.body);
    const slug = payload.slug ? slugify(payload.slug) : slugify(payload.name);
    if (!slug) return res.status(400).json({ error: 'Impossible de générer un slug à partir du nom fourni' });

    const category = await Category.create({ ...payload, slug });

    await logAdminAction(req, 'category.created', 'category', category._id, { name: category.name, slug: category.slug });

    res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    if (error.code === 11000) return res.status(409).json({ error: 'Une catégorie avec ce nom ou ce slug existe déjà' });
    res.status(500).json({ error: error.message });
  }
});

router.put('/categories/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const payload = adminCategorySchema.partial().parse(req.body);
    if (payload.slug) payload.slug = slugify(payload.slug);
    if (payload.parent && payload.parent === req.params.id) {
      return res.status(400).json({ error: 'Une catégorie ne peut pas être sa propre catégorie parente' });
    }

    const before = await Category.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ error: 'Category not found' });

    const category = await Category.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });

    await logAdminAction(req, 'category.updated', 'category', category._id, {
      name: category.name,
      changedKeys: Object.keys(payload),
    });

    res.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    if (error.code === 11000) return res.status(409).json({ error: 'Une catégorie avec ce nom ou ce slug existe déjà' });
    res.status(500).json({ error: error.message });
  }
});

// Empêche la suppression d'une catégorie encore utilisée par des produits, sauf
// réaffectation explicite (?reassignTo=<autreCategoryId>) ou suppression forcée (?force=true,
// qui retire simplement la catégorie des produits concernés).
router.delete('/categories/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const productCount = await Product.countDocuments({ categories: category._id });

    if (productCount > 0) {
      const { reassignTo, force } = req.query;

      if (reassignTo) {
        if (!OBJECT_ID_RE.test(reassignTo)) return res.status(400).json({ error: 'reassignTo invalide' });
        const target = await Category.findById(reassignTo);
        if (!target) return res.status(400).json({ error: 'Catégorie de réaffectation introuvable' });

        await Product.updateMany({ categories: category._id }, { $addToSet: { categories: target._id } });
        await Product.updateMany({ categories: category._id }, { $pull: { categories: category._id } });
        await Product.updateMany({ categorySlug: category.slug }, { $set: { categorySlug: target.slug } });
      } else if (force === 'true') {
        await Product.updateMany({ categories: category._id }, { $pull: { categories: category._id } });
        // Les produits qui perdent leur dernière catégorie retombent sur "non classé"
        // via categorySlug, pour rester valides côté catalogue public.
        await Product.updateMany(
          { categorySlug: category.slug, categories: { $size: 0 } },
          { $set: { categorySlug: 'non-classe' } }
        );
      } else {
        return res.status(409).json({
          error: `Cette catégorie est utilisée par ${productCount} produit(s). Réaffecte-les (?reassignTo=<id>) ou force la suppression (?force=true).`,
          productCount,
        });
      }
    }

    await Category.findByIdAndDelete(category._id);
    await logAdminAction(req, 'category.deleted', 'category', category._id, { name: category.name, reassignedProducts: productCount });

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Commandes
// ---------------------------------------------------------------------------

router.get('/orders', verifyToken, requireAdmin, async (req, res) => {
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
      Order.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Order.countDocuments(query),
    ]);

    res.json({ orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/orders/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    let order = OBJECT_ID_RE.test(id) ? await Order.findById(id) : null;
    if (!order) order = await Order.findOne({ orderNumber: id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trouve, pour un item de commande, la variante correspondante (taille+couleur) sur
// le produit référencé — ou `null` si le produit n'a pas de variantes définies (dans
// ce cas on retombe sur le décrément global `inventory` pour compat).
function findMatchingVariant(product, item) {
  if (!product.variants || product.variants.length === 0) return null;
  return (
    product.variants.find((v) => (v.size || null) === (item.size || null)) ||
    product.variants[0]
  );
}

router.put('/orders/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const status = z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).parse(req.body.status);

    const current = await Order.findById(req.params.id).select('_id status orderNumber');
    if (!current) return res.status(404).json({ error: 'Order not found' });

    const order = await Order.findByIdAndUpdate(req.params.id, { status, updatedAt: new Date() }, { new: true });

    await logAdminAction(req, 'order.status.updated', 'order', order._id, {
      orderNumber: order.orderNumber,
      from: current.status,
      to: status,
    });

    if (emailService) {
      try {
        if (status === 'shipped') await emailService.sendShipmentNotification(order);
        if (order.customer?.email && ['confirmed', 'shipped', 'delivered'].includes(status)) {
          const labels = { confirmed: 'Confirmée', shipped: 'Expédiée', delivered: 'Livrée' };
          await emailService.sendCustomerStatusUpdate(order, labels[status]);
        }
      } catch (err) {
        console.warn('Order status email failed:', err.message);
      }
    }

    // Décrément du stock PAR VARIANTE à la confirmation (politique actée : le stock ne
    // bouge qu'une fois la commande validée par l'admin, pas à la création).
    if (status === 'confirmed' && !order.inventoryReserved) {
      try {
        for (const item of order.items || []) {
          if (!item.productId || !OBJECT_ID_RE.test(item.productId)) continue;
          const product = await Product.findById(item.productId);
          if (!product) continue;
          const qty = Math.max(0, Number(item.quantity) || 0);
          const variant = findMatchingVariant(product, item);

          if (variant) {
            variant.stock = Math.max(0, (variant.stock || 0) - qty);
          } else {
            product.inventory = Math.max(0, (product.inventory || 0) - qty);
          }
          product.isOutOfStock = (product.inventory || 0) <= 0;
          await product.save();
        }
        await Order.findByIdAndUpdate(order._id, { inventoryReserved: true });
      } catch (err) {
        console.warn('Failed to decrement variant stock for order:', err.message);
      }
    }

    // Restauration du stock si la commande est annulée après avoir été confirmée.
    if (status === 'cancelled' && order.inventoryReserved) {
      try {
        for (const item of order.items || []) {
          if (!item.productId || !OBJECT_ID_RE.test(item.productId)) continue;
          const product = await Product.findById(item.productId);
          if (!product) continue;
          const qty = Math.max(0, Number(item.quantity) || 0);
          const variant = findMatchingVariant(product, item);

          if (variant) {
            variant.stock = (variant.stock || 0) + qty;
          } else {
            product.inventory = (product.inventory || 0) + qty;
          }
          product.isOutOfStock = (product.inventory || 0) <= 0;
          await product.save();
        }
        await Order.findByIdAndUpdate(order._id, { inventoryReserved: false });
      } catch (err) {
        console.warn('Failed to restore variant stock for cancelled order:', err.message);
      }
    }

    res.json(order);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' });
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Stats / clients / analytics / audit-logs
// ---------------------------------------------------------------------------

router.get('/stats', verifyToken, requireAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startWeek = new Date(now);
    startWeek.setDate(now.getDate() - 6);
    startWeek.setHours(0, 0, 0, 0);

    const todayKey = startDay.toISOString().slice(0, 10);
    const weekKeys = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      weekKeys.push(date.toISOString().slice(0, 10));
    }

    const [todayOrders, todaySalesRows, monthSalesRows, recentOrders, weeklyRows, statusCounts, lowStockProducts, todayPageViewRows, totalPageViewRows, weeklyPageViewRows] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: startDay } }),
      Order.aggregate([{ $match: { createdAt: { $gte: startDay } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: startMonth } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.find({}).sort({ createdAt: -1 }).limit(8),
      Order.aggregate([
        { $match: { createdAt: { $gte: startWeek } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' }, d: { $dayOfMonth: '$createdAt' } }, sales: { $sum: '$total' }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Product.find({ inventory: { $lte: 5 }, isVisible: true }).select('name inventory').sort({ inventory: 1 }).limit(10),
      PageView.aggregate([{ $match: { date: todayKey } }, { $group: { _id: null, total: { $sum: '$count' } } }]),
      PageView.aggregate([{ $group: { _id: null, total: { $sum: '$count' } } }]),
      PageView.aggregate([{ $match: { date: { $in: weekKeys } } }, { $group: { _id: '$date', total: { $sum: '$count' } } }]),
    ]);

    const dayLabels = weekKeys.map((key) => ({ key, label: new Date(key).toLocaleDateString('fr-FR', { weekday: 'short' }) }));
    const weeklyMap = new Map(weeklyRows.map((row) => [`${row._id.y}-${row._id.m}-${row._id.d}`, { sales: row.sales, orders: row.orders }]));
    const weeklyViewsMap = new Map(weeklyPageViewRows.map((row) => [row._id, row.total]));
    const weekly = dayLabels.map((d) => {
      const [y, m, dd] = d.key.split('-');
      const legacyKey = `${Number(y)}-${Number(m)}-${Number(dd)}`;
      return { day: d.label, ...(weeklyMap.get(legacyKey) || { sales: 0, orders: 0 }), views: weeklyViewsMap.get(d.key) || 0 };
    });
    const counts = statusCounts.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {});

    res.json({
      todayOrders,
      todaySales: todaySalesRows[0]?.total || 0,
      monthSales: monthSalesRows[0]?.total || 0,
      pendingOrders: counts.pending || 0,
      inProgressOrders: (counts.confirmed || 0) + (counts.shipped || 0),
      weekly,
      recentOrders,
      lowStockProducts,
      todayPageViews: todayPageViewRows[0]?.total || 0,
      totalPageViews: totalPageViewRows[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/clients', verifyToken, requireAdmin, async (_req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('_id email createdAt').sort({ createdAt: -1 });
    const aggregates = await Order.aggregate([
      { $group: { _id: '$userId', ordersCount: { $sum: 1 }, totalSpent: { $sum: '$total' }, lastOrderAt: { $max: '$createdAt' } } },
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

router.get('/analytics', verifyToken, requireAdmin, async (_req, res) => {
  try {
    const [paymentBreakdown, statusBreakdown, topProducts] = await Promise.all([
      Order.aggregate([{ $group: { _id: '$paymentMethod', count: { $sum: 1 }, amount: { $sum: '$total' } } }, { $sort: { amount: -1 } }]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Order.aggregate([
        { $unwind: '$items' },
        { $group: { _id: '$items.name', quantity: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),
    ]);
    res.json({ paymentBreakdown, statusBreakdown, topProducts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/audit-logs', verifyToken, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const action = req.query.action?.trim();
    const targetType = req.query.targetType?.trim();

    const query = {};
    if (action) query.action = action;
    if (targetType) query.targetType = targetType;

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      AuditLog.countDocuments(query),
    ]);

    res.json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

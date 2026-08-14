import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import path from 'path'
import { User } from './models/User.js'
import { Category } from './models/Category.js'
import { Product } from './models/Product.js'
import { Banner } from './models/Banner.js'

dotenv.config()

const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(serverDirectory, '..')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/noor-al-hayaa'

async function bootstrap() {
  await mongoose.connect(MONGODB_URI)
  console.log('✅ MongoDB connected for seed')

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error('❌ ADMIN_EMAIL / ADMIN_PASSWORD must be set in the environment to seed the admin account.')
    process.exit(1)
  }
  const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD

  const existingAdmin = await User.findOne({ email: adminEmail })
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    await User.create({ email: adminEmail, passwordHash, role: 'admin' })
    console.log(`✅ Admin user created: ${adminEmail}`)
  } else {
    console.log('ℹ️ Admin user already exists')
  }

  const categories = [
    { name: 'Abayas & Kimonos', slug: 'kimonos', description: 'Abayas et kimonos modestes pour femme', image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80' },
    { name: 'Robes Longues', slug: 'robes', description: 'Robes longues élégantes pour toutes occasions', image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=800&q=80' },
    { name: 'Boubous & Qamis', slug: 'boubou', description: 'Tenues traditionnelles raffinées pour homme', image: 'https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=800&q=80' },
  ]

  await Promise.all(categories.map((category) =>
    Category.updateOne({ slug: category.slug }, { $set: category }, { upsert: true })
  ))
  console.log('✅ Categories seeded')

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
  ]

  await Promise.all(banners.map((banner) =>
    Banner.updateOne({ title: banner.title }, { $set: banner }, { upsert: true })
  ))
  console.log('✅ Banners seeded')

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
  ]

  await Promise.all(products.map((product) =>
    Product.updateOne({ name: product.name }, { $set: product }, { upsert: true })
  ))
  console.log('✅ Products seeded')

  await mongoose.disconnect()
  console.log('✅ Seed complete')
}

bootstrap().catch((error) => {
  console.error('❌ Seed failed:', error)
  process.exit(1)
})

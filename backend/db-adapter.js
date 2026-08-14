import mongoose from 'mongoose'
import * as mockDb from './mockDb.js'

let usesMock = false
let realDb = null

export async function initializeDb() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/noor-al-hayaa'
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 3000,
    })
    console.log('✅ MongoDB connected')
    
    // Import real models
    const { User } = await import('./models/User.js')
    const { Product } = await import('./models/Product.js')
    const { Category } = await import('./models/Category.js')
    const { Banner } = await import('./models/Banner.js')
    const { Cart } = await import('./models/Cart.js')
    const { Wishlist } = await import('./models/Wishlist.js')
    const { Order } = await import('./models/Order.js')
    const { AuditLog } = await import('./models/AuditLog.js')
    const { PageView } = await import('./models/PageView.js')

    realDb = { User, Product, Category, Banner, Cart, Wishlist, Order, AuditLog, PageView }
    return false // not using mock
  } catch (err) {
    console.warn('⚠️ MongoDB unavailable, using Mock Database:', err.message)
    await mockDb.connect()
    usesMock = true
    return true // using mock
  }
}

export function getDb() {
  return usesMock ? mockDb : realDb
}

export function isUsingMock() {
  return usesMock
}

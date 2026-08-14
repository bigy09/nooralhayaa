import mongoose from 'mongoose';

let isConnected = false;

export async function connectDb() {
  if (isConnected) return true;

  try {
    // Même variable d'env que l'app principale (backend/db-adapter.js) : les deux
    // services doivent pointer vers la même base MongoDB puisqu'ils partagent les
    // mêmes modèles/collections (Product, Category, Order, User...).
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/noor-al-hayaa';
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('✅ MongoDB connected');
    return true;
  } catch (error) {
    console.warn('⚠️ MongoDB connection failed:', error.message);
    return false;
  }
}

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/noor-al-hayaa';

async function seed() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error('❌ ADMIN_EMAIL / ADMIN_PASSWORD must be set in the environment to seed the admin account.');
    process.exit(1);
  }

  await mongoose.connect(uri);

  const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`ℹ️ Admin already exists: ${email}`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ email, passwordHash, role: 'admin', refreshSessions: [] });
  console.log(`✅ Admin user created: ${email}`);
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});

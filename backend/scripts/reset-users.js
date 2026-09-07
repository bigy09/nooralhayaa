import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { User } from '../models/User.js'

const mongoUri = process.env.MONGODB_URI
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const adminPassword = process.env.ADMIN_PASSWORD

if (!mongoUri || !adminEmail || !adminPassword) {
  console.error('MONGODB_URI, ADMIN_EMAIL et ADMIN_PASSWORD sont requis.')
  process.exit(1)
}

try {
  await mongoose.connect(mongoUri)

  const passwordHash = await bcrypt.hash(adminPassword, 12)
  await User.deleteMany({ email: { $ne: adminEmail } })
  await User.updateOne(
    { email: adminEmail },
    {
      $set: {
        email: adminEmail,
        passwordHash,
        role: 'admin',
        refreshSessions: [],
      },
    },
    { upsert: true },
  )

  console.log(`Base utilisateurs réinitialisée. Admin conservé : ${adminEmail}`)
} finally {
  await mongoose.disconnect()
}

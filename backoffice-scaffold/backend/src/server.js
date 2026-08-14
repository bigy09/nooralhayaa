import app from './app.js';
import dotenv from 'dotenv';
import { connectDb } from './db/connection.js';

dotenv.config();

const port = process.env.PORT || 5000;

async function start() {
  const ready = await connectDb();
  if (!ready) {
    console.warn('⚠️ Could not connect to MongoDB before startup');
  }
  app.listen(port, () => {
    console.log(`✅ Admin API running on port ${port}`);
  });
}

start().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

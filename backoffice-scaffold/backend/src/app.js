import express from 'express';
import cors from 'cors';
import fs from 'fs';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { connectDb } from './db/connection.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Dossier d'uploads partagé avec l'app principale (même disque, même contenu).
const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(serverDirectory, '..', '..', '..');
const uploadDir = path.join(projectRoot, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((item) => item.trim()).filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadDir));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', async (_req, res) => {
  const ready = await connectDb();
  return res.json({ status: 'ok', database: ready ? 'connected' : 'disconnected' });
});

app.use((err, _req, res, _next) => {
  console.error(err.stack || err.message || err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;

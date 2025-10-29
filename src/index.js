import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

import { connectToDatabase } from './lib/db.js';
import authRoutes from './routes/auth.js';
import boardRoutes from './routes/boards.js';
import listRoutes from './routes/lists.js';
import cardRoutes from './routes/cards.js';

dotenv.config();

const app = express();

// Configure CORS explicitly. In production set CLIENT_ORIGIN to the exact
// origin of your frontend (for example: https://qurinom-frontend-one.vercel.app).
// If CLIENT_ORIGIN is not set we default to the frontend domain used on Vercel
// but we don't enable credentials by default unless an explicit origin is provided.
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'https://qurinom-frontend-one.vercel.app';
const ENABLE_CREDENTIALS = Boolean(process.env.CLIENT_ORIGIN);

app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: ENABLE_CREDENTIALS,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Ensure preflight requests get CORS headers
app.options('*', cors({ origin: CLIENT_ORIGIN, credentials: ENABLE_CREDENTIALS }));

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/cards', cardRoutes);

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await connectToDatabase();
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server listening on :${PORT}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

start();



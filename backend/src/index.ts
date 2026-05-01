import './validate-env';

import express, { Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import orderRoutes from './routes/orders';
import itemRoutes from './routes/items';
import measurementRoutes from './routes/measurements';
import billRoutes from './routes/bills';

const app = express();
// Render (and other proxies): correct client IP / secure cookies if we add them later
app.set('trust proxy', 1);

const PORT = Number(process.env.PORT) || 5000;

// ── CORS Configuration ──────────────────────────────────────────────
// Render's `property: host` gives a bare hostname like "crabs-frontend.onrender.com"
// (no protocol, no trailing slash). We normalise every origin we add.
const normaliseOrigin = (raw: string): string => {
  let url = raw.trim();
  if (!url) return '';
  if (!url.startsWith('http')) url = `https://${url}`;
  return url.replace(/\/+$/, '');
};

const allowedOrigins: string[] = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8080',
  'https://crabs-frontend.onrender.com',
];

// Add the deployed frontend URL (set via Render env var or manually)
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(normaliseOrigin(process.env.FRONTEND_URL));
}

// Add the deployed backend URL itself (useful for same-origin requests)
if (process.env.BACKEND_URL) {
  allowedOrigins.push(normaliseOrigin(process.env.BACKEND_URL));
}

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, server-side)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ── API Routes ───────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api/bills', billRoutes);

// ── Health Check ─────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', version: '1.0.0', env: process.env.NODE_ENV || 'development' });
});

// Bind explicitly for container hosts (Render expects the process to listen on 0.0.0.0:$PORT)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

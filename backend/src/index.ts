import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import orderRoutes from './routes/orders';
import itemRoutes from './routes/items';
import measurementRoutes from './routes/measurements';

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8080',
].filter(Boolean);

if (process.env.FRONTEND_URL) {
  // Add protocol if missing and remove trailing slash to avoid CORS mismatch
  let frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl.startsWith('http')) {
    frontendUrl = `https://${frontendUrl}`;
  }
  frontendUrl = frontendUrl.replace(/\/$/, "");
  allowedOrigins.push(frontendUrl);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/measurements', measurementRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import { config } from './config.js';
import { requireAuth } from './middleware/auth.js';

const app = express();

app.use(express.json());
app.use(cookieParser());

const publicRoutes = ['/api/auth/register', '/api/auth/login'];

app.use((req, res, next) => {
  if (req.method === 'OPTIONS' || publicRoutes.includes(req.path)) {
    return next();
  }

  return requireAuth(req, res, next);
});

app.use('/api/auth', authRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error(err);

  if (err.code === 11000) {
    return res.status(409).json({ message: 'Email is already registered' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
  }

  res.status(500).json({ message: 'Something went wrong' });
});

mongoose
  .connect(config.mongoUri)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(config.port, () => console.log(`🚀 Server running on http://localhost:${config.port}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

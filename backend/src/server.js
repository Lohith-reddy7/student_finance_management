import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import analyticsRoutes from './routes/analytics.js';
import incomeRoutes from './routes/income.js';
import advisorRoutes from './routes/advisor.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/advisor', advisorRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'MERN Node.js Backend' });
});

// Database & Server Initialization
const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/student_finance';

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🌱 Connected to MongoDB database');
    app.listen(PORT, () => {
      console.log(`🚀 Student Finance Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.log(`🚀 Backend running on http://localhost:${PORT} (standalone mode)`);
    app.listen(PORT);
  }
}

startServer();

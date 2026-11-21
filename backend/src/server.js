import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import analyticsRoutes from './routes/analytics.js';
import incomeRoutes from './routes/income.js';
import advisorRoutes from './routes/advisor.js';
import sprintRoutes from './routes/sprints.js';
import { socketService } from './services/socketService.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

// Initialize WebSocket Service with HTTP Server
socketService.init(server, corsOrigin);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/advisor', advisorRoutes);
app.use('/api/sprints', sprintRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'MERN Node.js Backend with Socket.io WebSockets' });
});

// Database & Server Initialization
const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/student_finance';

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🌱 Connected to MongoDB database');

    // Automatically drop legacy conflicting indexes if present
    try {
      const sprintsCollection = mongoose.connection.collection('sprints');
      const indexes = await sprintsCollection.indexes();
      const hasLegacyRoomCodeIndex = indexes.some(idx => idx.name === 'roomCode_1');
      if (hasLegacyRoomCodeIndex) {
        await sprintsCollection.dropIndex('roomCode_1');
        console.log('🧹 Cleaned up legacy roomCode_1 index');
      }
    } catch (indexErr) {
      // Ignore if index doesn't exist
    }

    server.listen(PORT, () => {
      console.log(`🚀 Student Finance Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.log(`🚀 Backend running on http://localhost:${PORT} (standalone mode)`);
    server.listen(PORT);
  }
}

startServer();

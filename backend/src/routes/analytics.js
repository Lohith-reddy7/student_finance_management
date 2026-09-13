import express from 'express';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { authenticate } from './auth.js';
import { predictZeroDateML } from '../services/aiBridge.js';

const router = express.Router();

router.get('/predict-zero', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: 1 });

    const prediction = await predictZeroDateML(
      transactions,
      user.allowanceAmount || 8000,
      user.currentBalance || 5000,
      user.allowanceCycleDay || 1
    );

    res.json(prediction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

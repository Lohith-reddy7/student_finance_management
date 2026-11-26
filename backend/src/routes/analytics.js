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

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthTransactions = await Transaction.find({
      userId: req.user.id,
      date: { $gte: startOfMonth }
    }).sort({ date: 1 });

    const allTransactions = await Transaction.find({ userId: req.user.id }).sort({ date: 1 });
    const transactionsForPrediction = thisMonthTransactions.length > 0 ? thisMonthTransactions : allTransactions;

    const prediction = await predictZeroDateML(
      transactionsForPrediction,
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

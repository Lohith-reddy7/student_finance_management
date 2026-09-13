import express from 'express';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { authenticate } from './auth.js';
import { askRAGAdvisor, predictZeroDateML } from '../services/aiBridge.js';

const router = express.Router();

router.post('/chat', authenticate, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const user = await User.findById(req.user.id);
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });

    const prediction = await predictZeroDateML(
      transactions,
      user?.allowanceAmount || 8000,
      user?.currentBalance || 5000,
      user?.allowanceCycleDay || 1
    );

    const response = await askRAGAdvisor(
      query,
      transactions,
      user?.currentBalance || 0,
      prediction.zero_balance_date_formatted || 'End of Month',
      prediction.recommended_daily_limit || 200
    );

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

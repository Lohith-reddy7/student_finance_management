import express from 'express';
import { Income } from '../models/Income.js';
import { User } from '../models/User.js';
import { authenticate } from './auth.js';

const router = express.Router();

// Add Extra Income entry (grandparent gift, competition prize, freelance)
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, amount, sourceCategory, date } = req.body;
    if (!title || !amount) {
      return res.status(400).json({ error: 'Title and amount are required' });
    }

    const incomeAmt = parseFloat(amount);
    const income = await Income.create({
      userId: req.user.id,
      title,
      amount: incomeAmt,
      sourceCategory: sourceCategory || 'Family & Relatives',
      date: date ? new Date(date) : new Date()
    });

    // Credit User Balance
    const user = await User.findById(req.user.id);
    if (user) {
      user.currentBalance += incomeAmt;
      await user.save();
    }

    res.status(201).json({
      income,
      updatedBalance: user ? user.currentBalance : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user income records
router.get('/', authenticate, async (req, res) => {
  try {
    const incomes = await Income.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(incomes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete extra income entry
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const income = await Income.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!income) return res.status(404).json({ error: 'Income entry not found' });

    // Deduct amount from user balance
    const user = await User.findById(req.user.id);
    if (user) {
      user.currentBalance = Math.max(0, user.currentBalance - income.amount);
      await user.save();
    }

    res.json({ message: 'Income entry deleted', deductedAmount: income.amount, updatedBalance: user ? user.currentBalance : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

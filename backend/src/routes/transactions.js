import express from 'express';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { authenticate } from './auth.js';
import { parseTransactionNLP } from '../services/aiBridge.js';

const router = express.Router();

// Parse SMS/Text using NLP Auto-Tagging
router.post('/parse', authenticate, async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText) return res.status(400).json({ error: 'rawText string is required' });

    const parsed = await parseTransactionNLP(rawText);

    const transaction = await Transaction.create({
      userId: req.user.id,
      rawText,
      merchant: parsed.merchant,
      amount: parsed.amount,
      category: parsed.category,
      confidence: parsed.confidence,
      autoTagged: true,
      date: new Date()
    });

    const user = await User.findById(req.user.id);
    if (user) {
      user.currentBalance = Math.max(0, user.currentBalance - parsed.amount);
      await user.save();
    }

    res.status(201).json({
      transaction,
      nlpInfo: parsed,
      updatedBalance: user ? user.currentBalance : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual transaction creation
router.post('/manual', authenticate, async (req, res) => {
  try {
    const { merchant, amount, category, date } = req.body;
    if (!merchant || !amount) return res.status(400).json({ error: 'Merchant and amount are required' });

    const transaction = await Transaction.create({
      userId: req.user.id,
      merchant,
      amount: parseFloat(amount),
      category: category || 'Miscellaneous',
      confidence: 1.0,
      autoTagged: false,
      date: date ? new Date(date) : new Date()
    });

    const user = await User.findById(req.user.id);
    if (user) {
      user.currentBalance = Math.max(0, user.currentBalance - parseFloat(amount));
      await user.save();
    }

    res.status(201).json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed 2-Week Sample History (Past 14 Days) for testing AI comparisons
router.post('/seed-sample', authenticate, async (req, res) => {
  try {
    const now = Date.now();
    const dayMs = 86400000;

    const sampleData = [
      // This Week (Days 1-5 ago)
      { merchant: 'Uber Trip', amount: 165, category: 'Transport & Travel', date: new Date(now - dayMs * 1), rawText: 'Paid INR 165 to UBER TRIP via UPI' },
      { merchant: 'Swiggy Delivery', amount: 280, category: 'Food & Dining', date: new Date(now - dayMs * 2), rawText: 'Paid Rs 280 to SWIGGY order' },
      { merchant: 'Metro Card Recharge', amount: 100, category: 'Transport & Travel', date: new Date(now - dayMs * 3), rawText: 'Debited 100 at Metro Station' },
      { merchant: 'Campus Bookstore', amount: 350, category: 'Academics & Books', date: new Date(now - dayMs * 4), rawText: 'Paid 350 at Campus Bookstore' },
      { merchant: 'Starbucks Coffee', amount: 210, category: 'Food & Dining', date: new Date(now - dayMs * 5), rawText: 'Paid INR 210 at Starbucks' },

      // Last Week (Days 8-12 ago)
      { merchant: 'Uber Auto', amount: 95, category: 'Transport & Travel', date: new Date(now - dayMs * 8), rawText: 'Paid Rs 95 to Uber Auto' },
      { merchant: 'Zomato Food', amount: 340, category: 'Food & Dining', date: new Date(now - dayMs * 9), rawText: 'Paid Rs 340 to ZOMATO' },
      { merchant: 'Rapido Bike', amount: 45, category: 'Transport & Travel', date: new Date(now - dayMs * 10), rawText: 'Paid 45 to Rapido' },
      { merchant: 'Hostel Canteen', amount: 120, category: 'Food & Dining', date: new Date(now - dayMs * 11), rawText: 'Paid 120 to Hostel Mess' },
      { merchant: 'Stationery Xerox', amount: 80, category: 'Academics & Books', date: new Date(now - dayMs * 12), rawText: 'Paid 80 for Xerox printing' }
    ];

    const docs = sampleData.map(s => ({
      userId: req.user.id,
      ...s,
      confidence: 0.95,
      autoTagged: true
    }));

    await Transaction.insertMany(docs);

    const allTxs = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });
    res.status(201).json({ message: 'Sample 2-week history created successfully', transactions: allTxs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user transactions
router.get('/', authenticate, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete transaction
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const tx = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const user = await User.findById(req.user.id);
    if (user) {
      user.currentBalance += tx.amount;
      await user.save();
    }

    res.json({ message: 'Transaction deleted', refundedAmount: tx.amount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

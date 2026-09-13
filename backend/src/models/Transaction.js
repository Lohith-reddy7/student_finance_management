import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rawText: { type: String, default: '' },
  merchant: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true, default: 'Miscellaneous' },
  confidence: { type: Number, default: 1.0 },
  autoTagged: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

export const Transaction = mongoose.model('Transaction', transactionSchema);

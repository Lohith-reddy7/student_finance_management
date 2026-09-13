import mongoose from 'mongoose';

const incomeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  sourceCategory: {
    type: String,
    enum: ['Family & Relatives', 'Competitions & Prizes', 'Part-Time / Freelance', 'Gifts & Bonuses', 'Other'],
    default: 'Family & Relatives'
  },
  date: { type: Date, default: Date.now }
});

export const Income = mongoose.model('Income', incomeSchema);

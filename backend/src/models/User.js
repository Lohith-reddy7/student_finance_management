import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  allowanceAmount: { type: Number, default: 8000 },
  allowanceCycleDay: { type: Number, default: 1 },
  currentBalance: { type: Number, default: 5000 },
  refreshToken: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);

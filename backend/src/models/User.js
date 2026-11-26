import mongoose from 'mongoose';

const redeemedRewardSchema = new mongoose.Schema({
  rewardId: { type: String, required: true },
  title: { type: String, required: true },
  category: { type: String, default: 'General' },
  pointsSpent: { type: Number, required: true },
  voucherCode: { type: String, required: true },
  value: { type: String, default: '' },
  redeemedAt: { type: Date, default: Date.now }
});

const avatarConfigSchema = new mongoose.Schema({
  gender: { type: String, enum: ['man', 'woman'], default: 'man' },
  equipped: {
    cap: { type: String, default: 'none' },
    sunglasses: { type: String, default: 'none' },
    jacket: { type: String, default: 'default_tee' },
    pants: { type: String, default: 'default_jeans' },
    shoes: { type: String, default: 'default_sneakers' }
  },
  ownedItems: {
    type: [String],
    default: ['default_tee', 'default_jeans', 'default_sneakers']
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  allowanceAmount: { type: Number, default: 8000 },
  allowanceCycleDay: { type: Number, default: 1 },
  lastAllowanceMonth: { type: String, default: null },
  monthlyAllowances: [{
    month: { type: String, required: true },
    amount: { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now }
  }],
  currentBalance: { type: Number, default: 5000 },
  rewardPoints: { type: Number, default: 350 }, // Starting points so user can style avatar immediately
  avatarConfig: {
    type: avatarConfigSchema,
    default: () => ({
      gender: 'man',
      equipped: {
        cap: 'none',
        sunglasses: 'none',
        jacket: 'default_tee',
        pants: 'default_jeans',
        shoes: 'default_sneakers'
      },
      ownedItems: ['default_tee', 'default_jeans', 'default_sneakers']
    })
  },
  redeemedRewards: [redeemedRewardSchema],
  refreshToken: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);

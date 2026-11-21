import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: 'U'
  },
  spent: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: String,
    default: 'Joined the sprint'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const sprintSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    default: 'All Spending'
  },
  targetBudget: {
    type: Number,
    required: true,
    min: 100
  },
  durationDays: {
    type: Number,
    default: 7
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  // Keep roomCode synced with inviteCode for backwards compatibility with any legacy indexes
  roomCode: {
    type: String,
    uppercase: true,
    trim: true,
    default: function() {
      return this.inviteCode;
    }
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active'
  },
  rewardPointsPool: {
    type: Number,
    default: 500
  },
  winner: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    spent: Number,
    pointsAwarded: Number,
    declaredAt: Date
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  participants: [participantSchema],
  activities: [
    {
      userName: String,
      text: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, { timestamps: true });

sprintSchema.pre('validate', function(next) {
  if (this.inviteCode && !this.roomCode) {
    this.roomCode = this.inviteCode;
  }
  if (this.roomCode && !this.inviteCode) {
    this.inviteCode = this.roomCode;
  }
  next();
});

export const Sprint = mongoose.model('Sprint', sprintSchema);

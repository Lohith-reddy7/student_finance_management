import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const router = express.Router();

// Dual JWT Secret Keys
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'stash-access-secret-key-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'stash-refresh-secret-key-2026';

export function generateAccessToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

export function generateRefreshToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Access token expired or invalid', code: 'TOKEN_EXPIRED' });
  }
}

// User Registration with Financial Baseline Setup
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, allowanceAmount, currentBalance, allowanceCycleDay } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      allowanceAmount: parseFloat(allowanceAmount) || 8000,
      currentBalance: parseFloat(currentBalance) || parseFloat(allowanceAmount) || 8000,
      allowanceCycleDay: parseInt(allowanceCycleDay) || 1
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        allowanceAmount: user.allowanceAmount,
        currentBalance: user.currentBalance,
        allowanceCycleDay: user.allowanceCycleDay,
        rewardPoints: user.rewardPoints || 0,
        redeemedRewards: user.redeemedRewards || []
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid email or password' });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        allowanceAmount: user.allowanceAmount,
        currentBalance: user.currentBalance,
        allowanceCycleDay: user.allowanceCycleDay,
        rewardPoints: user.rewardPoints || 0,
        redeemedRewards: user.redeemedRewards || []
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Refresh Access Token Endpoint using Refresh Token Secret
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ error: 'Invalid or revoked refresh token' });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    res.status(403).json({ error: 'Refresh token expired or invalid' });
  }
});

// Get Current User Profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshToken');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const userObj = user.toObject();
    userObj.id = user._id.toString();
    userObj._id = user._id.toString();
    res.json(userObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile Financial Setup
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, email, allowanceAmount, currentBalance, allowanceCycleDay } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name && typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }

    if (email && typeof email === 'string' && email.trim()) {
      const lowerEmail = email.trim().toLowerCase();
      if (lowerEmail !== user.email) {
        const existing = await User.findOne({ email: lowerEmail });
        if (existing) {
          return res.status(400).json({ error: 'This email address is already in use by another account' });
        }
        user.email = lowerEmail;
      }
    }

    if (allowanceAmount !== undefined && !isNaN(allowanceAmount)) {
      user.allowanceAmount = Math.max(0, parseFloat(allowanceAmount));
    }
    if (currentBalance !== undefined && !isNaN(currentBalance)) {
      user.currentBalance = Math.max(0, parseFloat(currentBalance));
    }
    if (allowanceCycleDay !== undefined && !isNaN(allowanceCycleDay)) {
      user.allowanceCycleDay = Math.min(31, Math.max(1, parseInt(allowanceCycleDay)));
    }

    await user.save();
    res.json({
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      allowanceAmount: user.allowanceAmount,
      currentBalance: user.currentBalance,
      allowanceCycleDay: user.allowanceCycleDay,
      rewardPoints: user.rewardPoints || 0,
      redeemedRewards: user.redeemedRewards || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout endpoint (clears refresh token in DB)
router.post('/logout', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

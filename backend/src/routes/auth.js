import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Income } from '../models/Income.js';
import { Transaction } from '../models/Transaction.js';

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
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = typeof password === 'string' ? password.trim() : password;

    if (!cleanName || !cleanEmail || !cleanPassword) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({
      email: { $regex: new RegExp(`^\\s*${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') }
    });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const initialAllowance = parseFloat(allowanceAmount) || 8000;

    const user = new User({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      allowanceAmount: initialAllowance,
      currentBalance: parseFloat(currentBalance) || initialAllowance,
      allowanceCycleDay: parseInt(allowanceCycleDay) || 1,
      lastAllowanceMonth: currentMonthStr,
      monthlyAllowances: [{
        month: currentMonthStr,
        amount: initialAllowance,
        updatedAt: now
      }]
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
        lastAllowanceMonth: user.lastAllowanceMonth,
        monthlyAllowances: user.monthlyAllowances || [],
        currentMonthStr,
        needsMonthlyAllowancePrompt: false,
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
    const cleanEmail = (email || '').trim().toLowerCase();
    const rawPassword = typeof password === 'string' ? password : String(password || '');
    const cleanPassword = rawPassword.trim();

    if (!cleanEmail || !rawPassword) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      // Fallback search with trimmed case-insensitive regex
      user = await User.findOne({
        email: { $regex: new RegExp(`^\\s*${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') }
      });
    }

    if (!user) {
      return res.status(400).json({ error: 'No account found with this email. Please check your email or register.' });
    }

    // Verify password across trimmed, raw, and Unicode normalized forms
    let isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch && rawPassword !== cleanPassword) {
      isMatch = await bcrypt.compare(rawPassword, user.password);
    }
    if (!isMatch) {
      isMatch = await bcrypt.compare(cleanPassword.normalize('NFC'), user.password);
    }
    if (!isMatch && rawPassword !== cleanPassword) {
      isMatch = await bcrypt.compare(rawPassword.normalize('NFC'), user.password);
    }

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid password. Please verify and try again.' });
    }

    // Sanitize user's email if it previously had surrounding whitespace
    if (user.email !== cleanEmail) {
      user.email = cleanEmail;
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [thisMonthIncomes, thisMonthTransactions] = await Promise.all([
      Income.find({ userId: user._id, date: { $gte: startOfMonth } }),
      Transaction.find({ userId: user._id, date: { $gte: startOfMonth } })
    ]);
    const totalExtraThisMonth = thisMonthIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const totalSpentThisMonth = thisMonthTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    user.currentBalance = Math.max(0, (user.allowanceAmount || 0) + totalExtraThisMonth - totalSpentThisMonth);

    await user.save();
    const allowanceCycleDay = user.allowanceCycleDay || 1;
    // Only prompt on the exact allowance reset day set by user, and only if not already confirmed for this month
    const isAllowanceDay = now.getDate() === allowanceCycleDay;
    const isAlreadyConfirmed = user.lastAllowanceMonth === currentMonthStr;
    const needsMonthlyAllowancePrompt = isAllowanceDay && !isAlreadyConfirmed;

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
        lastAllowanceMonth: user.lastAllowanceMonth,
        monthlyAllowances: user.monthlyAllowances || [],
        currentMonthStr,
        needsMonthlyAllowancePrompt,
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

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [thisMonthIncomes, thisMonthTransactions] = await Promise.all([
      Income.find({ userId: user._id, date: { $gte: startOfMonth } }),
      Transaction.find({ userId: user._id, date: { $gte: startOfMonth } })
    ]);
    const totalExtraThisMonth = thisMonthIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const totalSpentThisMonth = thisMonthTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // Strictly enforce: Balance = Total Money (Allowance + Extra Funds) - Total Expenses Spent this Month
    const totalMoneyThisMonth = (user.allowanceAmount || 0) + totalExtraThisMonth;
    user.currentBalance = Math.max(0, totalMoneyThisMonth - totalSpentThisMonth);
    await user.save();

    const userObj = user.toObject();
    userObj.id = user._id.toString();
    userObj._id = user._id.toString();

    const allowanceCycleDay = user.allowanceCycleDay || 1;
    // Only prompt on the exact allowance reset day set by user, and only if not already confirmed for this month
    const isAllowanceDay = now.getDate() === allowanceCycleDay;
    const isAlreadyConfirmed = user.lastAllowanceMonth === currentMonthStr;

    userObj.currentMonthStr = currentMonthStr;
    userObj.needsMonthlyAllowancePrompt = isAllowanceDay && !isAlreadyConfirmed;

    res.json(userObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update or confirm allowance for the current month
router.post('/monthly-allowance', authenticate, async (req, res) => {
  try {
    const { amount, addToBalance, month } = req.body;
    if (amount === undefined || isNaN(amount) || amount < 0) {
      return res.status(400).json({ error: 'Valid allowance amount is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = new Date();
    const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const newAllowance = parseFloat(amount);

    user.allowanceAmount = newAllowance;
    user.lastAllowanceMonth = targetMonth;

    if (!user.monthlyAllowances) user.monthlyAllowances = [];
    const existingIdx = user.monthlyAllowances.findIndex(m => m.month === targetMonth);
    if (existingIdx >= 0) {
      user.monthlyAllowances[existingIdx].amount = newAllowance;
      user.monthlyAllowances[existingIdx].updatedAt = new Date();
    } else {
      user.monthlyAllowances.push({
        month: targetMonth,
        amount: newAllowance,
        updatedAt: new Date()
      });
    }

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [thisMonthIncomes, thisMonthTransactions] = await Promise.all([
      Income.find({ userId: user._id, date: { $gte: startOfMonth } }),
      Transaction.find({ userId: user._id, date: { $gte: startOfMonth } })
    ]);
    const totalExtra = thisMonthIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const totalSpent = thisMonthTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // Available cash for the month is the allowance + extra funds - what's already spent this month
    if (addToBalance) {
      user.currentBalance = Math.max(0, newAllowance + totalExtra - totalSpent);
    } else {
      user.currentBalance = Math.min(user.currentBalance || 0, Math.max(0, newAllowance + totalExtra - totalSpent));
    }

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshToken;
    userObj.id = user._id.toString();
    userObj._id = user._id.toString();
    userObj.currentMonthStr = targetMonth;
    userObj.needsMonthlyAllowancePrompt = false;

    res.json({
      message: `Updated allowance for ${targetMonth} to ₹${newAllowance.toLocaleString('en-IN')}`,
      user: userObj
    });
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
      const parsedAmt = Math.max(0, parseFloat(allowanceAmount));
      user.allowanceAmount = parsedAmt;

      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      user.lastAllowanceMonth = currentMonthStr;

      if (!user.monthlyAllowances) user.monthlyAllowances = [];
      const existingIdx = user.monthlyAllowances.findIndex(m => m.month === currentMonthStr);
      if (existingIdx >= 0) {
        user.monthlyAllowances[existingIdx].amount = parsedAmt;
        user.monthlyAllowances[existingIdx].updatedAt = new Date();
      } else {
        user.monthlyAllowances.push({
          month: currentMonthStr,
          amount: parsedAmt,
          updatedAt: new Date()
        });
      }
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [thisMonthIncomes, thisMonthTransactions] = await Promise.all([
      Income.find({ userId: user._id, date: { $gte: startOfMonth } }),
      Transaction.find({ userId: user._id, date: { $gte: startOfMonth } })
    ]);
    const totalExtra = thisMonthIncomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const totalSpent = thisMonthTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const maxAllowedCash = user.allowanceAmount + totalExtra;

    if (currentBalance !== undefined && !isNaN(currentBalance)) {
      // Cash right now cannot exceed allowance + extra income
      user.currentBalance = Math.min(Math.max(0, parseFloat(currentBalance)), maxAllowedCash);
    } else if (user.currentBalance > maxAllowedCash) {
      user.currentBalance = Math.max(0, maxAllowedCash - totalSpent);
    }

    if (allowanceCycleDay !== undefined && !isNaN(allowanceCycleDay)) {
      user.allowanceCycleDay = Math.min(31, Math.max(1, parseInt(allowanceCycleDay)));
    }

    await user.save();

    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    res.json({
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      allowanceAmount: user.allowanceAmount,
      currentBalance: user.currentBalance,
      allowanceCycleDay: user.allowanceCycleDay,
      lastAllowanceMonth: user.lastAllowanceMonth,
      monthlyAllowances: user.monthlyAllowances || [],
      currentMonthStr,
      needsMonthlyAllowancePrompt: false,
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

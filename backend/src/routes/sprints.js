import express from 'express';
import { Sprint } from '../models/Sprint.js';
import { User } from '../models/User.js';
import { authenticate } from './auth.js';
import { socketService } from '../services/socketService.js';

const router = express.Router();

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 1. Get all sprints user is part of
router.get('/', authenticate, async (req, res) => {
  try {
    const sprints = await Sprint.find({
      'participants.userId': req.user.id
    }).sort({ createdAt: -1 });

    // Mark current user flag per participant
    const mapped = sprints.map(sprint => {
      const doc = sprint.toObject();
      doc.participants = doc.participants.map(p => ({
        ...p,
        isCurrentUser: String(p.userId) === String(req.user.id)
      })).sort((a, b) => a.spent - b.spent); // lowest spenders first (winning)
      return doc;
    });

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get single sprint details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

    const doc = sprint.toObject();
    doc.participants = doc.participants.map(p => ({
      ...p,
      isCurrentUser: String(p.userId) === String(req.user.id)
    })).sort((a, b) => a.spent - b.spent);

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Create a new Savings Sprint
router.post('/create', authenticate, async (req, res) => {
  try {
    const { title, category, targetBudget, durationDays = 7 } = req.body;
    if (!title || !targetBudget) {
      return res.status(400).json({ error: 'Title and target budget are required' });
    }

    const user = await User.findById(req.user.id);
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const hostName = user && user.name ? user.name : 'Host Student';

    let inviteCode = generateInviteCode();
    // Ensure code uniqueness
    while (await Sprint.findOne({ inviteCode })) {
      inviteCode = generateInviteCode();
    }

    const sprint = await Sprint.create({
      creatorId: req.user.id,
      title: title.trim(),
      category: category || 'All Spending',
      targetBudget: Number(targetBudget),
      durationDays: Number(durationDays),
      inviteCode,
      startDate,
      endDate,
      participants: [
        {
          userId: req.user.id,
          name: hostName,
          avatar: hostName ? hostName[0].toUpperCase() : 'H',
          spent: 0,
          lastActivity: 'Created the sprint'
        }
      ],
      activities: [
        {
          userName: hostName,
          text: `created the "${title.trim()}" sprint with ₹${targetBudget} cap`,
          timestamp: new Date()
        }
      ]
    });

    const doc = sprint.toObject();
    socketService.broadcastSprintUpdate(sprint._id, doc);

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Join an existing sprint using Invite Code
router.post('/join', authenticate, async (req, res) => {
  try {
    const code = (req.body.inviteCode || req.body.roomCode || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'Room code is required' });

    const sprint = await Sprint.findOne({
      $or: [{ inviteCode: code }, { roomCode: code }]
    });
    if (!sprint) return res.status(404).json({ error: 'Invalid room code' });

    const user = await User.findById(req.user.id);
    const existing = sprint.participants.find(p => p.userId && String(p.userId) === String(req.user.id));
    
    if (existing) {
      return res.json(sprint.toObject());
    }

    const joinerName = user && user.name ? user.name : 'Student Peer';
    const newParticipant = {
      userId: req.user.id,
      name: joinerName,
      avatar: joinerName ? joinerName[0].toUpperCase() : 'S',
      spent: 0,
      lastActivity: 'Joined the sprint'
    };

    sprint.participants.push(newParticipant);
    sprint.activities.unshift({
      userName: joinerName,
      text: 'joined the savings sprint challenge!',
      timestamp: new Date()
    });

    await sprint.save();

    const doc = sprint.toObject();
    socketService.broadcastSprintUpdate(sprint._id, doc);
    socketService.broadcastActivity(sprint._id, {
      userName: joinerName,
      text: 'joined the savings sprint challenge!'
    });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Seed Demo Campus Sprint (Instant Guide Evaluation)
router.post('/seed-demo', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const userName = user ? user.name : 'Lohith';

    // Remove older demo sprint if exists
    await Sprint.deleteMany({ creatorId: req.user.id, title: 'Campus Week: Food & Cab Discipline' });

    const startDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // Day 3 of 7
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const demoSprint = await Sprint.create({
      creatorId: req.user.id,
      title: 'Campus Week: Food & Cab Discipline',
      category: 'Food & Dining / Transport',
      targetBudget: 1500,
      durationDays: 7,
      inviteCode: 'CAMPUS',
      startDate,
      endDate,
      participants: [
        {
          name: 'Priya Sharma',
          avatar: 'P',
          spent: 420,
          isCurrentUser: false,
          lastActivity: 'Cooked hostel meal (Saved ₹150)'
        },
        {
          userId: req.user.id,
          name: userName,
          avatar: userName[0].toUpperCase(),
          spent: 650,
          isCurrentUser: true,
          lastActivity: 'Logged Metro recharge (₹100)'
        },
        {
          name: 'Rahul Verma',
          avatar: 'R',
          spent: 890,
          isCurrentUser: false,
          lastActivity: 'Swiggy late night order (₹280)'
        },
        {
          name: 'Ananya Iyer',
          avatar: 'A',
          spent: 1280,
          isCurrentUser: false,
          lastActivity: 'Uber ride across town (₹320)'
        }
      ],
      activities: [
        {
          userName: 'Priya Sharma',
          text: 'took the #1 lead by keeping spending under ₹450!',
          timestamp: new Date(Date.now() - 1000 * 60 * 25)
        },
        {
          userName: userName,
          text: 'logged ₹100 for Metro Smart Card recharge',
          timestamp: new Date(Date.now() - 1000 * 60 * 65)
        },
        {
          userName: 'Rahul Verma',
          text: 'ordered dinner on Swiggy (-₹280)',
          timestamp: new Date(Date.now() - 1000 * 60 * 180)
        },
        {
          userName: 'Ananya Iyer',
          text: 'joined the Campus Week sprint',
          timestamp: new Date(Date.now() - 1000 * 60 * 360)
        }
      ]
    });

    const doc = demoSprint.toObject();
    socketService.broadcastSprintUpdate(demoSprint._id, doc);

    res.status(201).json({
      message: 'Demo Campus Savings Sprint generated successfully!',
      sprint: doc
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Simulate Peer Activity & Progress (Live WebSocket Demo for Guide)
router.post('/:id/simulate-peer', authenticate, async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

    // Pick a peer
    const peers = sprint.participants.filter(p => !p.userId || String(p.userId) !== String(req.user.id));
    if (peers.length === 0) {
      return res.status(400).json({ error: 'No peer participants available to simulate' });
    }

    const randomPeer = peers[Math.floor(Math.random() * peers.length)];
    const additions = [
      { text: 'ordered chai & snacks at campus canteen (-₹65)', amount: 65 },
      { text: 'took Rapido bike ride to library (-₹45)', amount: 45 },
      { text: 'skipped Starbucks and brewed coffee (+Saved ₹180)', amount: 0 },
      { text: 'shared Swiggy group lunch (-₹140)', amount: 140 }
    ];
    const picked = additions[Math.floor(Math.random() * additions.length)];

    randomPeer.spent += picked.amount;
    randomPeer.lastActivity = picked.text;
    randomPeer.updatedAt = new Date();

    sprint.activities.unshift({
      userName: randomPeer.name,
      text: picked.text,
      timestamp: new Date()
    });

    // Keep activities capped
    if (sprint.activities.length > 25) sprint.activities = sprint.activities.slice(0, 25);

    await sprint.save();

    const doc = sprint.toObject();
    doc.participants = doc.participants.sort((a, b) => a.spent - b.spent);

    // Real-time broadcast
    socketService.broadcastSprintUpdate(sprint._id, doc);
    socketService.broadcastActivity(sprint._id, {
      userName: randomPeer.name,
      text: picked.text
    });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// REWARDS STORE & WINNER COMPLETION SYSTEM
// ==========================================

export const REWARDS_CATALOG = [
  {
    id: 'rew_cafe_150',
    title: 'Campus Cafeteria Beverage & Meal Pass',
    description: 'Get ₹150 off any hot beverage, fresh juice, or cafeteria meal at your student dining hall.',
    cost: 150,
    category: 'Dining',
    tag: 'Popular',
    value: '₹150 Food Pass',
    iconName: 'Coffee'
  },
  {
    id: 'rew_book_250',
    title: 'Campus Bookstore & Stationery Discount',
    description: 'Get ₹250 off academic textbooks, notebooks, printouts, or campus stationery supplies.',
    cost: 250,
    category: 'Academics',
    tag: 'Student Essential',
    value: '₹250 Book Voucher',
    iconName: 'BookOpen'
  },
  {
    id: 'rew_swiggy_400',
    title: 'Swiggy / Zomato Late-Night Feast Voucher',
    description: 'Get ₹200 off your next food delivery order on Swiggy or Zomato.',
    cost: 400,
    category: 'Food Delivery',
    tag: 'Top Pick',
    value: '₹200 Coupon',
    iconName: 'Utensils'
  },
  {
    id: 'rew_spotify_600',
    title: '1-Month Music Streaming Pass',
    description: 'Enjoy 30 days of ad-free study playlists and podcasts on Spotify or Apple Music.',
    cost: 600,
    category: 'Entertainment',
    tag: 'Entertainment',
    value: '1-Month Pass',
    iconName: 'Headphones'
  },
  {
    id: 'rew_movie_750',
    title: 'Weekend Cinema Movie Ticket Pass',
    description: 'Flat ₹300 off weekend cinema tickets for post-exam celebrations with friends.',
    cost: 750,
    category: 'Entertainment',
    tag: 'Weekend Special',
    value: '₹300 Ticket Pass',
    iconName: 'Ticket'
  },
  {
    id: 'rew_badge_1000',
    title: 'Stash Certified Budget Master Certificate & Medal',
    description: 'Exclusive Gold Saver profile medal and downloadable FinTech budgeting certification for your CV.',
    cost: 1000,
    category: 'Status & Certification',
    tag: 'Prestige',
    value: 'Gold Profile Badge',
    iconName: 'Award'
  }
];

// 7. Get Rewards Catalog
router.get('/rewards/catalog', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      catalog: REWARDS_CATALOG,
      userPoints: user ? (user.rewardPoints || 0) : 0,
      redeemedRewards: user ? (user.redeemedRewards || []) : []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Redeem a Reward with Points
router.post('/rewards/redeem', authenticate, async (req, res) => {
  try {
    const { rewardId } = req.body;
    if (!rewardId) return res.status(400).json({ error: 'Reward ID is required' });

    const reward = REWARDS_CATALOG.find(r => r.id === rewardId);
    if (!reward) return res.status(404).json({ error: 'Reward not found in catalog' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const currentPoints = user.rewardPoints || 0;
    if (currentPoints < reward.cost) {
      return res.status(400).json({
        error: `Insufficient points! You have ${currentPoints} points, but this reward costs ${reward.cost} points.`
      });
    }

    // Deduct points
    user.rewardPoints = currentPoints - reward.cost;

    // Generate unique voucher code
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const voucherCode = `STASH-${reward.category.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '')}-${randomSuffix}`;

    const newRedemption = {
      rewardId: reward.id,
      title: reward.title,
      category: reward.category,
      pointsSpent: reward.cost,
      voucherCode,
      value: reward.value,
      redeemedAt: new Date()
    };

    if (!user.redeemedRewards) user.redeemedRewards = [];
    user.redeemedRewards.unshift(newRedemption);

    await user.save();

    res.json({
      message: `Successfully redeemed "${reward.title}"!`,
      voucherCode,
      redeemed: newRedemption,
      updatedPoints: user.rewardPoints
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Complete Sprint & Award Points to Winner
router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

    if (sprint.status === 'completed') {
      return res.status(400).json({ error: 'This savings sprint has already been completed' });
    }

    if (!sprint.participants || sprint.participants.length === 0) {
      return res.status(400).json({ error: 'No participants in this sprint to declare a winner' });
    }

    // Sort participants by lowest spending (winner is the lowest spender under budget)
    const sorted = [...sprint.participants].sort((a, b) => a.spent - b.spent);
    const winnerParticipant = sorted[0];
    const pointsPool = sprint.rewardPointsPool || 500;

    // Award points strictly and exclusively to the champion in database
    let winnerName = winnerParticipant.name;
    if (winnerParticipant.userId) {
      const winnerUser = await User.findById(winnerParticipant.userId);
      if (winnerUser) {
        winnerName = winnerUser.name;
        winnerUser.rewardPoints = (winnerUser.rewardPoints || 0) + pointsPool;
        await winnerUser.save();
        console.log(`🏆 [Sprint Winner] Awarded ${pointsPool} points to ${winnerUser.name} (${winnerUser._id})`);
      }
    }

    sprint.status = 'completed';
    sprint.winner = {
      userId: winnerParticipant.userId,
      name: winnerName,
      spent: winnerParticipant.spent,
      pointsAwarded: pointsPool,
      declaredAt: new Date()
    };

    sprint.activities.unshift({
      userName: '🏆 Stash Referee',
      text: `declared ${winnerName} the Champion with ₹${winnerParticipant.spent} spent! Awarded ${pointsPool} Stash Reward Points!`,
      timestamp: new Date()
    });

    if (sprint.activities.length > 30) sprint.activities = sprint.activities.slice(0, 30);
    await sprint.save();

    const doc = sprint.toObject();
    doc.participants = doc.participants.sort((a, b) => a.spent - b.spent);

    // Broadcast completion to all live WebSocket room participants
    socketService.broadcastSprintUpdate(sprint._id, doc);
    socketService.broadcastActivity(sprint._id, {
      userName: '🏆 Stash Referee',
      text: `congratulations to ${winnerParticipant.name}! Won the competition and claimed ${pointsPool} points!`
    });

    res.json({
      message: `Sprint completed! ${winnerParticipant.name} declared the winner with ${pointsPool} points!`,
      sprint: doc,
      winner: sprint.winner
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// AVATAR STYLIST STUDIO & WARDROBE SYSTEM
// ==========================================

export const WARDROBE_CATALOG = [
  // 1. CAPS & HATS
  {
    id: 'none_cap',
    key: 'none',
    name: 'Natural Hair (No Cap)',
    category: 'cap',
    cost: 0,
    color: '#334155',
    description: 'Clean natural hairstyle without any headwear.'
  },
  {
    id: 'cap_baseball',
    key: 'cap_baseball',
    name: 'Varsity Snapback Cap',
    category: 'cap',
    cost: 70,
    color: '#e11d48',
    description: 'Sporty crimson collegiate cap with modern visor.'
  },
  {
    id: 'cap_beanie',
    key: 'cap_beanie',
    name: 'Emerald Slouch Beanie',
    category: 'cap',
    cost: 90,
    color: '#059669',
    description: 'Cozy knitted ribbed beanie for chilly campus mornings.'
  },
  {
    id: 'cap_bucket',
    key: 'cap_bucket',
    name: 'Streetwear Bucket Hat',
    category: 'cap',
    cost: 120,
    color: '#d97706',
    description: 'Golden mustard bucket hat for casual festival vibes.'
  },
  {
    id: 'cap_grad',
    key: 'cap_grad',
    name: 'Academic Graduation Mortarboard',
    category: 'cap',
    cost: 180,
    color: '#1e1b4b',
    description: 'Prestigious graduation cap with a golden champion tassel.'
  },

  // 2. SUNGLASSES & EYEWEAR
  {
    id: 'none_sunglasses',
    key: 'none',
    name: 'Clear Eyes (No Glasses)',
    category: 'sunglasses',
    cost: 0,
    color: '#0f172a',
    description: 'Fresh look without eyewear.'
  },
  {
    id: 'shades_aviator',
    key: 'shades_aviator',
    name: 'Gold Pilot Aviators',
    category: 'sunglasses',
    cost: 80,
    color: '#f59e0b',
    description: 'Teardrop pilot frames with reflective tinted lenses.'
  },
  {
    id: 'shades_retro',
    key: 'shades_retro',
    name: 'Midnight Wayfarers',
    category: 'sunglasses',
    cost: 100,
    color: '#020617',
    description: 'Iconic dark square framed UV-blocking shades.'
  },
  {
    id: 'shades_cyber',
    key: 'shades_cyber',
    name: 'Cyberpunk Neon Visor',
    category: 'sunglasses',
    cost: 150,
    color: '#06b6d4',
    description: 'Ultramodern glowing cyan futuristic visor glasses.'
  },

  // 3. JACKETS & SHIRTS
  {
    id: 'default_tee',
    key: 'default_tee',
    name: 'Classic Cotton Crew Tee',
    category: 'jacket',
    cost: 0,
    color: '#64748b',
    description: 'Breathable slate grey everyday casual cotton shirt.'
  },
  {
    id: 'top_hoodie',
    key: 'top_hoodie',
    name: 'Campus Blue Hoodie',
    category: 'jacket',
    cost: 130,
    color: '#2563eb',
    description: 'Warm, cozy oversized hoodie with front kangaroo pocket.'
  },
  {
    id: 'top_varsity',
    key: 'top_varsity',
    name: 'Letterman Varsity Jacket',
    category: 'jacket',
    cost: 190,
    color: '#1e3a8a',
    description: 'Collegiate navy wool jacket with cream leather sleeves.'
  },
  {
    id: 'top_leather',
    key: 'top_leather',
    name: 'Biker Leather Jacket',
    category: 'jacket',
    cost: 240,
    color: '#18181b',
    description: 'Rebellious asphalt-black zipped motorcycle jacket.'
  },
  {
    id: 'top_formal',
    key: 'top_formal',
    name: 'Tailored Oxford Shirt & Tie',
    category: 'jacket',
    cost: 160,
    color: '#f8fafc',
    description: 'Crisp pressed button-down shirt with slim burgundy tie.'
  },

  // 4. PANTS & BOTTOMS
  {
    id: 'default_jeans',
    key: 'default_jeans',
    name: 'Classic Indigo Denim',
    category: 'pants',
    cost: 0,
    color: '#1e40af',
    description: 'Everyday standard washed blue denim jeans.'
  },
  {
    id: 'pants_cargo',
    key: 'pants_cargo',
    name: 'Utility Olive Cargo Pants',
    category: 'pants',
    cost: 110,
    color: '#3f6212',
    description: 'Tough multi-pocket military green cargo trousers.'
  },
  {
    id: 'pants_joggers',
    key: 'pants_joggers',
    name: 'Midnight Black Joggers',
    category: 'pants',
    cost: 140,
    color: '#09090b',
    description: 'Flexible tapered streetwear athletic joggers with cuffs.'
  },
  {
    id: 'pants_formal',
    key: 'pants_formal',
    name: 'Pleated Charcoal Trousers',
    category: 'pants',
    cost: 170,
    color: '#334155',
    description: 'Sharp, tailored suit trousers for formal presentations.'
  },

  // 5. SHOES & FOOTWEAR
  {
    id: 'default_sneakers',
    key: 'default_sneakers',
    name: 'Low-Top Canvas Sneakers',
    category: 'shoes',
    cost: 0,
    color: '#ffffff',
    description: 'Clean white rubber sole minimalist campus sneakers.'
  },
  {
    id: 'shoes_running',
    key: 'shoes_running',
    name: 'Lime Neon Sport Runners',
    category: 'shoes',
    cost: 95,
    color: '#84cc16',
    description: 'High-cushion responsive athletic trainers.'
  },
  {
    id: 'shoes_boots',
    key: 'shoes_boots',
    name: 'Rugged Chelsea Leather Boots',
    category: 'shoes',
    cost: 180,
    color: '#78350f',
    description: 'Distressed brown leather boots with sturdy rubber tread.'
  }
];

// 10. Get Wardrobe Catalog & User Avatar Configuration
router.get('/avatar/wardrobe', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Initialize avatarConfig if not already present
    if (!user.avatarConfig) {
      user.avatarConfig = {
        gender: 'man',
        equipped: {
          cap: 'none',
          sunglasses: 'none',
          jacket: 'default_tee',
          pants: 'default_jeans',
          shoes: 'default_sneakers'
        },
        ownedItems: ['default_tee', 'default_jeans', 'default_sneakers', 'none']
      };
      await user.save();
    }

    res.json({
      catalog: WARDROBE_CATALOG,
      userPoints: user.rewardPoints || 0,
      avatarConfig: user.avatarConfig
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Buy an Item from the Wardrobe
router.post('/avatar/buy', authenticate, async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'Item ID is required' });

    const item = WARDROBE_CATALOG.find(i => i.id === itemId);
    if (!item) return res.status(404).json({ error: 'Wardrobe item not found' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.avatarConfig) {
      user.avatarConfig = {
        gender: 'man',
        equipped: { cap: 'none', sunglasses: 'none', jacket: 'default_tee', pants: 'default_jeans', shoes: 'default_sneakers' },
        ownedItems: ['default_tee', 'default_jeans', 'default_sneakers', 'none']
      };
    }

    const currentOwned = user.avatarConfig.ownedItems || [];
    if (currentOwned.includes(item.key) || currentOwned.includes(item.id)) {
      return res.status(400).json({ error: 'You already own this wardrobe item!' });
    }

    const currentPoints = user.rewardPoints || 0;
    if (currentPoints < item.cost) {
      return res.status(400).json({
        error: `Insufficient Stash Points! You have ${currentPoints} points, but this item costs ${item.cost} points.`
      });
    }

    // Deduct points and add to inventory
    user.rewardPoints = currentPoints - item.cost;
    user.avatarConfig.ownedItems.push(item.key);

    // Auto-equip purchased item
    user.avatarConfig.equipped[item.category] = item.key;

    // Mark user modified for subdocument
    user.markModified('avatarConfig');
    await user.save();

    res.json({
      message: `Purchased and equipped "${item.name}"!`,
      updatedPoints: user.rewardPoints,
      avatarConfig: user.avatarConfig,
      purchasedItem: item
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Equip / Unequip an Owned Item
router.post('/avatar/equip', authenticate, async (req, res) => {
  try {
    const { category, itemKey } = req.body;
    if (!category || !itemKey) return res.status(400).json({ error: 'Category and itemKey are required' });

    const validCategories = ['cap', 'sunglasses', 'jacket', 'pants', 'shoes'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid wardrobe category' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.avatarConfig) {
      user.avatarConfig = {
        gender: 'man',
        equipped: { cap: 'none', sunglasses: 'none', jacket: 'default_tee', pants: 'default_jeans', shoes: 'default_sneakers' },
        ownedItems: ['default_tee', 'default_jeans', 'default_sneakers', 'none']
      };
    }

    const owned = user.avatarConfig.ownedItems || [];
    if (itemKey !== 'none' && !owned.includes(itemKey)) {
      return res.status(403).json({ error: 'You do not own this item yet. Please purchase it with points first.' });
    }

    user.avatarConfig.equipped[category] = itemKey;
    user.markModified('avatarConfig');
    await user.save();

    res.json({
      message: `Equipped ${itemKey} in ${category}`,
      avatarConfig: user.avatarConfig
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Switch Avatar Character Gender / Model
router.post('/avatar/gender', authenticate, async (req, res) => {
  try {
    const { gender } = req.body;
    if (gender !== 'man' && gender !== 'woman') {
      return res.status(400).json({ error: 'Gender must be either "man" or "woman"' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.avatarConfig) {
      user.avatarConfig = {
        gender: 'man',
        equipped: { cap: 'none', sunglasses: 'none', jacket: 'default_tee', pants: 'default_jeans', shoes: 'default_sneakers' },
        ownedItems: ['default_tee', 'default_jeans', 'default_sneakers', 'none']
      };
    }

    user.avatarConfig.gender = gender;
    user.markModified('avatarConfig');
    await user.save();

    res.json({
      message: `Model switched to ${gender}`,
      avatarConfig: user.avatarConfig
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

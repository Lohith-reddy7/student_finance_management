import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  PlusCircle, 
  Share2, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  Copy, 
  ChevronRight,
  TrendingDown,
  Clock,
  Radio,
  Calendar,
  Wallet,
  Tag,
  Sparkles,
  Award,
  Coffee,
  BookOpen,
  Utensils,
  Headphones,
  Ticket,
  Check,
  RefreshCw,
  AlertCircle,
  ShoppingBag,
  Eye,
  Crown
} from 'lucide-react';
import { api } from '../lib/api';
import { socketClient } from '../lib/socket';
import { formatCurrency } from '../lib/format';
import { AvatarDisplay, AvatarEquipped } from '../components/AvatarDisplay';

interface Participant {
  _id?: string;
  userId?: string;
  name: string;
  avatar: string;
  spent: number;
  isCurrentUser: boolean;
  lastActivity: string;
  updatedAt: string;
}

interface ActivityItem {
  userName: string;
  text: string;
  timestamp: string;
}

interface WinnerInfo {
  userId?: string;
  name?: string;
  spent?: number;
  pointsAwarded?: number;
  declaredAt?: string;
}

interface Sprint {
  _id: string;
  title: string;
  category: string;
  targetBudget: number;
  durationDays: number;
  inviteCode: string;
  status: string;
  rewardPointsPool?: number;
  winner?: WinnerInfo;
  startDate: string;
  endDate: string;
  participants: Participant[];
  activities: ActivityItem[];
}

interface WardrobeItem {
  id: string;
  key: string;
  name: string;
  category: 'cap' | 'sunglasses' | 'jacket' | 'pants' | 'shoes';
  cost: number;
  color: string;
  description: string;
}

interface RewardVoucher {
  id: string;
  title: string;
  description: string;
  cost: number;
  category: string;
  tag: string;
  value: string;
  iconName: string;
}

interface RedeemedReward {
  rewardId: string;
  title: string;
  category: string;
  pointsSpent: number;
  voucherCode: string;
  value: string;
  redeemedAt: string;
}

interface SavingsSprintsProps {
  user?: any;
  onRefreshUser?: () => void;
}

export const SavingsSprints: React.FC<SavingsSprintsProps> = ({ user, onRefreshUser }) => {
  // Navigation Tab: 'sprints' | 'stylist' | 'rewards'
  const [activeTab, setActiveTab] = useState<'sprints' | 'stylist' | 'rewards'>('sprints');

  // Sprints state
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [completingSprint, setCompletingSprint] = useState<boolean>(false);

  // Modal / Form States
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('All Spending');
  const [newBudget, setNewBudget] = useState('1500');
  const [newDuration, setNewDuration] = useState('7');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [formError, setFormError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Avatar Stylist State
  const [wardrobeCatalog, setWardrobeCatalog] = useState<WardrobeItem[]>([]);
  const [wardrobeCategory, setWardrobeCategory] = useState<'cap' | 'sunglasses' | 'jacket' | 'pants' | 'shoes'>('cap');
  const [avatarGender, setAvatarGender] = useState<'man' | 'woman'>(user?.avatarConfig?.gender || 'man');
  const [avatarEquipped, setAvatarEquipped] = useState<AvatarEquipped>(user?.avatarConfig?.equipped || {
    cap: 'none',
    sunglasses: 'none',
    jacket: 'default_tee',
    pants: 'default_jeans',
    shoes: 'default_sneakers'
  });
  const [ownedItems, setOwnedItems] = useState<string[]>(user?.avatarConfig?.ownedItems || ['default_tee', 'default_jeans', 'default_sneakers', 'none']);
  const [userPoints, setUserPoints] = useState<number>(user?.rewardPoints !== undefined ? user.rewardPoints : 0);
  const [stylistActionLoading, setStylistActionLoading] = useState<string | null>(null);

  // Rewards Store State
  const [rewardsCatalog, setRewardsCatalog] = useState<RewardVoucher[]>([]);
  const [redeemedRewards, setRedeemedRewards] = useState<RedeemedReward[]>([]);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [justRedeemedCode, setJustRedeemedCode] = useState<{ title: string; code: string } | null>(null);

  const currentUserId = user?._id || user?.id;

  const processSprintParticipants = (sprint: Sprint, userId: string | undefined): Sprint => {
    return {
      ...sprint,
      participants: (sprint.participants || []).map(p => ({
        ...p,
        isCurrentUser: Boolean(userId && p.userId && String(p.userId) === String(userId))
      })).sort((a, b) => a.spent - b.spent)
    };
  };

  const fetchSprints = async () => {
    try {
      const res = await api.get('/sprints');
      const rawSprints: Sprint[] = res.data || [];
      const mapped = rawSprints.map(s => processSprintParticipants(s, currentUserId));
      setSprints(mapped);
      if (mapped.length > 0) {
        setSelectedSprint(prev => {
          if (!prev) return mapped[0];
          const matched = mapped.find((s: Sprint) => s._id === prev._id);
          return matched || mapped[0];
        });
      } else {
        setSelectedSprint(null);
      }
    } catch (err) {
      console.error('Failed to load sprints:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWardrobe = async () => {
    try {
      const res = await api.get('/sprints/avatar/wardrobe');
      if (res.data) {
        setWardrobeCatalog(res.data.catalog || []);
        setUserPoints(res.data.userPoints || 0);
        if (res.data.avatarConfig) {
          setAvatarGender(res.data.avatarConfig.gender || 'man');
          setAvatarEquipped(res.data.avatarConfig.equipped || {});
          setOwnedItems(res.data.avatarConfig.ownedItems || []);
        }
      }
    } catch (err) {
      console.error('Failed to load wardrobe:', err);
    }
  };

  const fetchRewardsCatalog = async () => {
    try {
      const res = await api.get('/sprints/rewards/catalog');
      if (res.data) {
        setRewardsCatalog(res.data.catalog || []);
        setUserPoints(res.data.userPoints || 0);
        setRedeemedRewards(res.data.redeemedRewards || []);
      }
    } catch (err) {
      console.error('Failed to load rewards store:', err);
    }
  };

  useEffect(() => {
    fetchSprints();
    fetchWardrobe();
    fetchRewardsCatalog();

    const socket = socketClient.connect();

    socketClient.onSprintsListChanged(() => {
      fetchSprints();
    });

    return () => {
      socketClient.removeListeners();
    };
  }, [currentUserId]);

  // Keep local user points synced with parent user prop
  useEffect(() => {
    if (user?.rewardPoints !== undefined) {
      setUserPoints(user.rewardPoints);
    }
    if (user?.avatarConfig) {
      setAvatarGender(user.avatarConfig.gender || 'man');
      setAvatarEquipped(user.avatarConfig.equipped || {});
      setOwnedItems(user.avatarConfig.ownedItems || []);
    }
  }, [user]);

  // When selected sprint changes, join its WebSocket room
  useEffect(() => {
    if (selectedSprint?._id) {
      socketClient.joinSprint(selectedSprint._id);

      socketClient.onSprintUpdate((updatedSprint: Sprint) => {
        if (updatedSprint._id === selectedSprint._id) {
          const processed = processSprintParticipants(updatedSprint, currentUserId);
          setSelectedSprint(processed);
          setSprints(prev => prev.map(s => s._id === processed._id ? processed : s));

          // When sprint completes, immediately re-sync points and status for all participants
          if (updatedSprint.status === 'completed') {
            fetchWardrobe();
            onRefreshUser?.();
            if (updatedSprint.winner?.userId && String(updatedSprint.winner.userId) === String(currentUserId)) {
              setStatusMsg(`🎉 CONGRATULATIONS! You won the sprint and earned ${updatedSprint.winner.pointsAwarded || 500} Stash Points!`);
            }
          }
        }
      });

      return () => {
        socketClient.leaveSprint(selectedSprint._id);
      };
    }
  }, [selectedSprint?._id, currentUserId]);

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newTitle.trim()) {
      setFormError('Please enter a room title');
      return;
    }
    const days = parseInt(newDuration);
    if (isNaN(days) || days < 1) {
      setFormError('Please specify a valid number of days (at least 1 day)');
      return;
    }
    const budget = parseFloat(newBudget);
    if (isNaN(budget) || budget <= 0) {
      setFormError('Please specify a valid budget cap');
      return;
    }

    try {
      const res = await api.post('/sprints/create', {
        title: newTitle.trim(),
        category: newCategory,
        targetBudget: budget,
        durationDays: days
      });
      setShowCreateModal(false);
      setNewTitle('');
      await fetchSprints();
      setSelectedSprint(res.data);
      setStatusMsg(`Room "${res.data.title}" created! Share code ${res.data.inviteCode} with friends to compete.`);
      setTimeout(() => setStatusMsg(''), 5000);
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create sprint room');
    }
  };

  const handleJoinSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) {
      setFormError('Please enter the 6-character room code');
      return;
    }

    try {
      const res = await api.post('/sprints/join', {
        inviteCode: code
      });
      setShowJoinModal(false);
      setJoinCodeInput('');
      await fetchSprints();
      setSelectedSprint(res.data);
      setStatusMsg(`Successfully joined "${res.data.title}"! You are now live in the competition.`);
      setTimeout(() => setStatusMsg(''), 5000);
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Invalid or non-existent room code. Please check and try again.');
    }
  };

  const handleCompleteSprint = async () => {
    if (!selectedSprint) return;
    setCompletingSprint(true);
    try {
      const res = await api.post(`/sprints/${selectedSprint._id}/complete`);
      const winner = res.data.winner;
      const isWinnerMe = winner?.userId && String(winner.userId) === String(currentUserId);
      setStatusMsg(
        isWinnerMe
          ? `🎉 Congratulations! You won with only ${formatCurrency(winner?.spent || 0)} spent and earned ${winner?.pointsAwarded || 500} Stash Points!`
          : `🏆 Sprint finished! ${winner?.name || 'Peer'} won with lowest spending (${formatCurrency(winner?.spent || 0)}) and claimed ${winner?.pointsAwarded || 500} points!`
      );
      await fetchSprints();
      await fetchWardrobe();
      onRefreshUser?.();
      setTimeout(() => setStatusMsg(''), 7000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to complete sprint');
    } finally {
      setCompletingSprint(false);
    }
  };

  // Avatar Stylist actions
  const handleToggleGender = async (gender: 'man' | 'woman') => {
    setAvatarGender(gender);
    try {
      await api.post('/sprints/avatar/gender', { gender });
      onRefreshUser?.();
    } catch (err) {
      console.error('Failed to change gender:', err);
    }
  };

  const handleEquipItem = async (category: 'cap' | 'sunglasses' | 'jacket' | 'pants' | 'shoes', itemKey: string) => {
    setStylistActionLoading(itemKey);
    try {
      const res = await api.post('/sprints/avatar/equip', { category, itemKey });
      if (res.data.avatarConfig) {
        setAvatarEquipped(res.data.avatarConfig.equipped || {});
      }
      onRefreshUser?.();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Could not equip item');
    } finally {
      setStylistActionLoading(null);
    }
  };

  const handleBuyItem = async (item: WardrobeItem) => {
    if (userPoints < item.cost) {
      alert(`Insufficient Stash Points! You need ${item.cost - userPoints} more points to purchase this item. Win Savings Sprints to earn points!`);
      return;
    }
    setStylistActionLoading(item.id);
    try {
      const res = await api.post('/sprints/avatar/buy', { itemId: item.id });
      setUserPoints(res.data.updatedPoints);
      if (res.data.avatarConfig) {
        setAvatarEquipped(res.data.avatarConfig.equipped || {});
        setOwnedItems(res.data.avatarConfig.ownedItems || []);
      }
      setStatusMsg(`🎉 Unlocked and equipped "${item.name}"!`);
      onRefreshUser?.();
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Purchase failed');
    } finally {
      setStylistActionLoading(null);
    }
  };

  // Rewards Store actions
  const handleRedeemReward = async (reward: RewardVoucher) => {
    if (userPoints < reward.cost) {
      alert(`Insufficient points! You need ${reward.cost - userPoints} more points to redeem ${reward.title}.`);
      return;
    }
    setRedeemingId(reward.id);
    try {
      const res = await api.post('/sprints/rewards/redeem', { rewardId: reward.id });
      setUserPoints(res.data.updatedPoints);
      if (res.data.redeemed) {
        setRedeemedRewards(prev => [res.data.redeemed, ...prev]);
        setJustRedeemedCode({ title: reward.title, code: res.data.voucherCode });
      }
      onRefreshUser?.();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Redemption failed');
    } finally {
      setRedeemingId(null);
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const categories = [
    'All Spending',
    'Food & Dining',
    'Transport & Travel',
    'Academics & Books',
    'Entertainment & Subs',
    'Shopping & Essentials'
  ];

  const currentCategoryItems = wardrobeCatalog.filter(i => i.category === wardrobeCategory);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Top Header & Points Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Savings Sprints & Rewards</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              <Radio className="w-3 h-3 animate-pulse text-emerald-600" />
              <span>Live WebSockets</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Compete in budget rooms, earn points for discipline, style your student avatar, and redeem cafeteria & bookstore perks.
          </p>
        </div>

        {/* Right Header: Points Counter & Navigation Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 shadow-2xs">
            <span className="text-base">🪙</span>
            <div>
              <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block leading-none">Stash Points</span>
              <span className="text-sm font-black text-amber-950">{userPoints} pts</span>
            </div>
          </div>

          {activeTab === 'sprints' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFormError('');
                  setShowJoinModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition shadow-2xs flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5 text-slate-600" />
                <span>Join Code</span>
              </button>

              <button
                onClick={() => {
                  setFormError('');
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition shadow-2xs flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create Room</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('sprints')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'sprints'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Competition Sprints</span>
          {sprints.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'sprints' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {sprints.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('stylist')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'stylist'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Avatar Stylist Studio</span>
          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase">
            New
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rewards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'rewards'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Rewards & Vouchers</span>
          {redeemedRewards.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              {redeemedRewards.length} Owned
            </span>
          )}
        </button>
      </div>

      {/* Global Status Message Toast */}
      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: COMPETITION SPRINTS & LEADERBOARD                                   */}
      {/* ========================================================================= */}
      {activeTab === 'sprints' && (
        <>
          {sprints.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              
              {/* Card 1: Create a Room */}
              <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Create a New Room</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Set a competition title, choose duration in days (e.g. 3, 7, 14 days), set a budget cap, and challenge friends to save. Winner receives <strong>500 Stash Points</strong>!
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFormError('');
                    setShowCreateModal(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition shadow-xs flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create a Room</span>
                </button>
              </div>

              {/* Card 2: Join a Room with Code */}
              <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Join Room with Code</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Has a friend started a savings sprint? Enter their 6-character room code to enter the competition and sync live spending in real time.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFormError('');
                    setShowJoinModal(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 transition shadow-xs flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Join Room with Code</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Sprints Rooms List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-slate-900">Your Active Challenges ({sprints.length})</span>
                  <span className="text-[10px] text-slate-400 font-medium">Click to view room</span>
                </div>

                <div className="space-y-2.5">
                  {sprints.map((sprint) => {
                    const isSelected = selectedSprint?._id === sprint._id;
                    const isCompleted = sprint.status === 'completed';

                    return (
                      <div
                        key={sprint._id}
                        onClick={() => setSelectedSprint(sprint)}
                        className={`p-4 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                              {isCompleted ? (
                                <span className="text-amber-700 font-bold flex items-center gap-1">
                                  <Crown className="w-3 h-3 text-amber-500" />
                                  Completed Challenge
                                </span>
                              ) : (
                                <span className="text-emerald-700 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Live Room
                                </span>
                              )}
                              <span>•</span>
                              <span className="text-slate-500">{sprint.durationDays} Days</span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm mt-0.5 leading-snug">{sprint.title}</h4>
                            <p className="text-[10px] text-slate-500 mt-1">Code: <strong className="font-mono text-slate-800">{sprint.inviteCode}</strong></p>
                          </div>
                          <span className="text-xs font-extrabold text-blue-700 shrink-0">
                            ₹{sprint.targetBudget}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Active Sprint Leaderboard & Winner Card */}
              {selectedSprint && (
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Sprint Header & Target Details */}
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <span>{selectedSprint.category}</span>
                          <span>•</span>
                          <span>{selectedSprint.durationDays} Days Challenge</span>
                          <span>•</span>
                          {selectedSprint.status === 'completed' ? (
                            <span className="text-amber-700 font-bold flex items-center gap-1">
                              <Crown className="w-3.5 h-3.5 text-amber-500" />
                              Winner Declared
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                              Live Room
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">
                          {selectedSprint.title}
                        </h2>
                      </div>

                      {/* Code & Declare Winner Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyInviteCode(selectedSprint.inviteCode)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-mono font-bold flex items-center gap-1.5 transition"
                          title="Click to copy invite code"
                        >
                          <span>CODE: {selectedSprint.inviteCode}</span>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                        </button>

                        {selectedSprint.status !== 'completed' && (
                          <button
                            onClick={handleCompleteSprint}
                            disabled={completingSprint}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                            title="End competition and award 500 Stash Points to the winner"
                          >
                            <Trophy className="w-3.5 h-3.5" />
                            <span>{completingSprint ? 'Declaring...' : 'Declare Winner 🏆'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Target Metrics */}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Budget Cap</span>
                        <span className="text-base font-extrabold text-slate-900">{formatCurrency(selectedSprint.targetBudget)}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Participants</span>
                        <span className="text-base font-extrabold text-slate-900">{selectedSprint.participants.length} Joined</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Winner Prize</span>
                        <span className="text-base font-extrabold text-amber-700 flex items-center gap-1">
                          <span>🪙</span>
                          <span>500 pts</span>
                        </span>
                      </div>
                    </div>

                    {/* Winner Podium Celebration Banner */}
                    {selectedSprint.winner && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-100 to-amber-50 border border-amber-300 text-amber-950 flex items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-500 text-white font-black text-lg flex items-center justify-center shadow-xs">
                            🏆
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">Competition Champion</span>
                            <h4 className="text-sm font-black text-slate-900">
                              {selectedSprint.winner.name} won with only {formatCurrency(selectedSprint.winner.spent || 0)} spent!
                            </h4>
                            <p className="text-[11px] text-amber-800 mt-0.5">
                              Awarded <strong>{selectedSprint.winner.pointsAwarded || 500} Stash Points</strong> to spend in the Avatar Stylist & Rewards store!
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveTab('stylist')}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-2xs shrink-0"
                        >
                          Style Avatar →
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Leaderboard Table */}
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-500" />
                          <span>Live Competition Leaderboard</span>
                        </h3>
                        <p className="text-[11px] text-slate-500">Ranked by lowest spending under the budget cap</p>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">Synced Live</span>
                    </div>

                    <div className="space-y-3 pt-1">
                      {selectedSprint.participants.map((participant, index) => {
                        const remaining = Math.max(0, selectedSprint.targetBudget - participant.spent);
                        const percentage = Math.min(100, Math.round((participant.spent / selectedSprint.targetBudget) * 100));
                        const isExceeded = participant.spent > selectedSprint.targetBudget;

                        let rankBadge = (
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                            #{index + 1}
                          </span>
                        );
                        if (index === 0) {
                          rankBadge = (
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs flex items-center justify-center border border-amber-300">
                              🥇
                            </span>
                          );
                        } else if (index === 1) {
                          rankBadge = (
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center justify-center">
                              🥈
                            </span>
                          );
                        } else if (index === 2) {
                          rankBadge = (
                            <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 font-extrabold text-xs flex items-center justify-center">
                              🥉
                            </span>
                          );
                        }

                        return (
                          <div
                            key={participant._id || index}
                            className={`p-3.5 rounded-xl border transition ${
                              participant.isCurrentUser
                                ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-500/20'
                                : 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                {rankBadge}

                                {/* Mini Avatar Display or Initial */}
                                <div className="w-9 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                  {participant.isCurrentUser ? (
                                    <AvatarDisplay
                                      gender={avatarGender}
                                      equipped={avatarEquipped}
                                      size="sm"
                                    />
                                  ) : (
                                    <span className="font-bold text-xs text-slate-700">{participant.avatar || participant.name[0]}</span>
                                  )}
                                </div>

                                <div>
                                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                                    <span>{participant.name}</span>
                                    {participant.isCurrentUser && (
                                      <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 text-[10px] font-semibold">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-xs">
                                    {participant.lastActivity}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="font-extrabold text-xs text-slate-900">
                                  {formatCurrency(participant.spent)}
                                </div>
                                <div className={`text-[10px] font-semibold ${isExceeded ? 'text-red-600' : 'text-emerald-700'}`}>
                                  {isExceeded ? 'Exceeded Budget' : `${formatCurrency(remaining)} remaining`}
                                </div>
                              </div>
                            </div>

                            {/* Spending Bar */}
                            <div className="mt-2.5">
                              <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full transition-all duration-500 ${
                                    isExceeded 
                                      ? 'bg-red-500' 
                                      : percentage > 75 
                                      ? 'bg-amber-500' 
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Room Activity Feed */}
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      <Activity className="w-4 h-4 text-blue-700" />
                      <span>Real-Time Room Activity Feed</span>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto pr-1">
                      {selectedSprint.activities?.map((activity, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-700"></span>
                            <span className="font-bold text-slate-900">{activity.userName}</span>
                            <span className="text-slate-600 font-normal">{activity.text}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AVATAR STYLIST STUDIO                                              */}
      {/* ========================================================================= */}
      {activeTab === 'stylist' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          
          {/* Left Panel: 2D Character Studio & Model Selector (5 Cols) */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col items-center justify-between space-y-6">
            
            {/* Model Gender Toggle Header */}
            <div className="w-full flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Student Character</h3>
                <p className="text-xs text-slate-500">Pick a base model & customize clothing</p>
              </div>

              {/* Model Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleToggleGender('man')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    avatarGender === 'man' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  👦 Man
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleGender('woman')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    avatarGender === 'woman' ? 'bg-white text-pink-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  👧 Woman
                </button>
              </div>
            </div>

            {/* Character Visual Showcase */}
            <div className="py-4 flex flex-col items-center justify-center">
              <AvatarDisplay
                gender={avatarGender}
                equipped={avatarEquipped}
                size="xl"
              />

              <div className="mt-4 text-center">
                <h4 className="font-extrabold text-sm text-slate-900">{user?.name || 'Student Saver'}</h4>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold mt-1">
                  Budget Champion Style
                </span>
              </div>
            </div>

            {/* Currently Equipped Summary Pills */}
            <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Cap / Hat</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {wardrobeCatalog.find(i => i.key === avatarEquipped.cap)?.name || 'Natural Hair'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Sunglasses</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {wardrobeCatalog.find(i => i.key === avatarEquipped.sunglasses)?.name || 'None'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Jacket / Top</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {wardrobeCatalog.find(i => i.key === avatarEquipped.jacket)?.name || 'Cotton Tee'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Pants & Bottom</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {wardrobeCatalog.find(i => i.key === avatarEquipped.pants)?.name || 'Denim Jeans'}
                </span>
              </div>
            </div>

          </div>

          {/* Right Panel: Wardrobe Catalog & Shopping Grid (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Category Filter Tabs */}
            <div className="p-2 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center gap-1.5">
              {[
                { id: 'cap', label: '🧢 Caps & Hats' },
                { id: 'sunglasses', label: '🕶️ Sunglasses' },
                { id: 'jacket', label: '👕 Jackets & Tops' },
                { id: 'pants', label: '👖 Pants & Jeans' },
                { id: 'shoes', label: '👟 Footwear' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setWardrobeCategory(cat.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    wardrobeCategory === cat.id
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Wardrobe Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {currentCategoryItems.map((item) => {
                const isOwned = ownedItems.includes(item.key) || ownedItems.includes(item.id) || item.cost === 0;
                const isEquipped = avatarEquipped[item.category] === item.key;
                const canAfford = userPoints >= item.cost;
                const isActionLoading = stylistActionLoading === item.id || stylistActionLoading === item.key;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition shadow-2xs flex flex-col justify-between space-y-3 ${
                      isEquipped
                        ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-500/20'
                        : isOwned
                        ? 'bg-white border-slate-200 hover:border-slate-300'
                        : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs shrink-0"
                            style={{ backgroundColor: item.color }}
                          ></span>
                          <span className="font-extrabold text-xs text-slate-900 leading-snug">{item.name}</span>
                        </div>

                        {/* Price Badge */}
                        <span className={`text-[11px] font-black shrink-0 ${isOwned ? 'text-emerald-700' : 'text-amber-800'}`}>
                          {isOwned ? (
                            'Owned'
                          ) : (
                            <span className="flex items-center gap-1">
                              <span>🪙</span>
                              <span>{item.cost} pts</span>
                            </span>
                          )}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Action Button */}
                    <div>
                      {isEquipped ? (
                        <button
                          type="button"
                          onClick={() => handleEquipItem(item.category, 'none')}
                          disabled={isActionLoading || item.key === 'none' || item.key === 'default_tee' || item.key === 'default_jeans'}
                          className="w-full py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-60"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Equipped</span>
                        </button>
                      ) : isOwned ? (
                        <button
                          type="button"
                          onClick={() => handleEquipItem(item.category, item.key)}
                          disabled={isActionLoading}
                          className="w-full py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs"
                        >
                          <span>{isActionLoading ? 'Equipping...' : 'Equip Item'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleBuyItem(item)}
                          disabled={!canAfford || isActionLoading}
                          className={`w-full py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs ${
                            canAfford
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <span>🪙</span>
                          <span>{canAfford ? `Buy for ${item.cost} pts` : `Need ${item.cost - userPoints} more pts`}</span>
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REWARDS & VOUCHERS STORE                                           */}
      {/* ========================================================================= */}
      {activeTab === 'rewards' && (
        <div className="space-y-6 pt-2">
          
          {/* Rewards Header Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 block">Student Perks Exchange</span>
              <h2 className="text-xl font-black mt-1 tracking-tight">Redeem Student Rewards & Coupons</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Turn your saved money and sprint points into Swiggy cash, BookMyShow tickets, Blinkit snacks, and Spotify passes.
              </p>
            </div>
            <div className="px-5 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-center shrink-0">
              <span className="text-[10px] font-bold text-amber-300 uppercase block">Available Balance</span>
              <span className="text-xl font-black text-white">🪙 {userPoints} Points</span>
            </div>
          </div>

          {/* New Redemption Success Alert Modal */}
          {justRedeemedCode && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-lg font-bold shrink-0">
                  🎁
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">Voucher Claimed!</span>
                  <h4 className="text-xs font-bold text-slate-900">{justRedeemedCode.title}</h4>
                  <p className="text-xs font-mono font-bold text-emerald-800 mt-0.5">
                    Code: <span className="bg-emerald-200/80 px-2 py-0.5 rounded text-slate-900">{justRedeemedCode.code}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(justRedeemedCode.code);
                  alert(`Copied ${justRedeemedCode.code} to clipboard!`);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition"
              >
                Copy Code
              </button>
            </div>
          )}

          {/* Catalog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewardsCatalog.map((reward) => {
              const canAfford = userPoints >= reward.cost;
              const isRedeeming = redeemingId === reward.id;

              return (
                <div
                  key={reward.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                        {reward.tag}
                      </span>
                      <span className="font-black text-xs text-amber-700 flex items-center gap-1">
                        <span>🪙</span>
                        <span>{reward.cost} pts</span>
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{reward.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{reward.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700">{reward.value}</span>
                    <button
                      onClick={() => handleRedeemReward(reward)}
                      disabled={!canAfford || isRedeeming}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs ${
                        canAfford
                          ? 'bg-blue-700 hover:bg-blue-800 text-white'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isRedeeming ? 'Redeeming...' : canAfford ? 'Redeem Voucher' : `Need ${reward.cost - userPoints} pts`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Redeemed Vouchers History */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-emerald-600" />
              <span>Your Redeemed Coupons & Pass Codes ({redeemedRewards.length})</span>
            </h3>

            {redeemedRewards.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                No vouchers redeemed yet. Earn points by winning Savings Sprints and claim rewards above!
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {redeemedRewards.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <h5 className="font-bold text-slate-900">{item.title}</h5>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Redeemed {new Date(item.redeemedAt).toLocaleDateString()} • {item.pointsSpent} pts
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded bg-slate-100 font-mono font-bold text-slate-800 text-xs">
                        {item.voucherCode}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.voucherCode);
                          alert(`Copied ${item.voucherCode}!`);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-600"
                        title="Copy code"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS: CREATE ROOM & JOIN WITH CODE                                      */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Create a Competition Room</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSprint} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Room Title / Challenge Name</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Hostel Weekend Survival or 7-Day Food Cap"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Category Focus</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-700"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Budget Cap (₹)</label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    placeholder="1500"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Duration (Days)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={60}
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    placeholder="7"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                🏆 Winner of this competition will automatically receive <strong>500 Stash Points</strong> to spend in the Avatar Stylist Studio & Rewards Store!
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition shadow-xs"
                >
                  Create Room & Get Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Join Competition Room</h3>
              <button 
                onClick={() => setShowJoinModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleJoinSprint} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Enter 6-Character Room Code</label>
                <input
                  type="text"
                  maxLength={8}
                  required
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. CAMPUS or 7X9B2"
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-center font-mono font-black text-lg tracking-widest uppercase focus:outline-none focus:border-blue-700"
                />
                <p className="text-[11px] text-slate-400 mt-1 text-center">Ask your roommate or peer for their room invite code</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition shadow-xs"
                >
                  Join Room Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

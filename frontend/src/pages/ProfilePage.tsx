import React, { useState, useEffect } from 'react';
import { User, Mail, Wallet, Calendar, PlusCircle, Trash2, Check, ArrowLeft, LogOut, Award, Sparkles, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../lib/format';
import { AvatarDisplay } from '../components/AvatarDisplay';

interface ProfilePageProps {
  user: any;
  incomes: any[];
  balance: number;
  allowance: number;
  onUpdateProfile: (name: string, email: string, allowanceAmount: number, currentBalance: number, allowanceCycleDay: number) => Promise<boolean>;
  onAddIncome: (title: string, amount: number, sourceCategory: string) => Promise<boolean>;
  onDeleteIncome: (id: string) => void;
  onLogout?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  incomes,
  balance,
  allowance,
  onUpdateProfile,
  onAddIncome,
  onDeleteIncome,
  onLogout
}) => {
  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [allowanceAmount, setAllowanceAmount] = useState(user?.allowanceAmount || 8000);
  const [currentBalance, setCurrentBalance] = useState(balance || 3500);
  const [allowanceCycleDay, setAllowanceCycleDay] = useState(user?.allowanceCycleDay || 1);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Sync inputs with user prop on load or updates
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setAllowanceAmount(user.allowanceAmount !== undefined ? user.allowanceAmount : 8000);
      setCurrentBalance(balance !== undefined ? balance : (user.currentBalance || 3500));
      setAllowanceCycleDay(user.allowanceCycleDay || 1);
    }
  }, [user, balance]);

  // Extra Income form state
  const [incomeTitle, setIncomeTitle] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('Family & Relatives');
  const [isSubmittingIncome, setIsSubmittingIncome] = useState(false);

  const categories = [
    'Family & Relatives',
    'Competitions & Prizes',
    'Part-Time / Freelance',
    'Gifts & Bonuses',
    'Other'
  ];

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setIsSavingProfile(true);

    try {
      const updated = await onUpdateProfile(
        name.trim(),
        email.trim(),
        parseFloat(allowanceAmount.toString()),
        parseFloat(currentBalance.toString()),
        parseInt(allowanceCycleDay.toString())
      );
      if (updated) {
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3500);
      } else {
        setProfileError('Failed to update profile. Please verify your details.');
      }
    } catch (err: any) {
      setProfileError(err.response?.data?.error || 'Profile update failed.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(incomeAmount);
    if (!incomeTitle.trim() || isNaN(amt) || amt <= 0) return;

    setIsSubmittingIncome(true);
    const added = await onAddIncome(incomeTitle.trim(), amt, incomeCategory);
    if (!added) {
      setIsSubmittingIncome(false);
      return;
    }
    setIncomeTitle('');
    setIncomeAmount('');
    setIsSubmittingIncome(false);
  };

  return (
    <div className="profile-page space-y-8 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline mb-1 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Account Profile & Monthly Funds
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure monthly allowance parameters and record one-time extra funds received this month.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 1. ACCOUNT & ALLOWANCE SETUP FORM */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border flex items-center justify-center font-bold" style={{ background: 'var(--info-bg)', borderColor: 'color-mix(in srgb, var(--info) 22%, transparent)', color: 'var(--info)' }}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Student Account Baseline</h2>
              <p className="text-xs text-slate-500">Update personal info and regular monthly allowance</p>
            </div>
          </div>

          {profileSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Settings updated successfully.</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Monthly Allowance (₹)</label>
                <div className="relative">
                  <Wallet className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="number"
                    required
                    min={0}
                    value={allowanceAmount}
                    onChange={(e) => setAllowanceAmount(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Cash Right Now (₹)</label>
                <div className="relative">
                  <Wallet className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="number"
                    required
                    min={0}
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Allowance Cycle Reset Day</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <select
                  value={allowanceCycleDay}
                  onChange={(e) => setAllowanceCycleDay(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-700"
                >
                  <option value={1}>1st of the month</option>
                  <option value={5}>5th of the month</option>
                  <option value={10}>10th of the month</option>
                  <option value={15}>15th of the month</option>
                  <option value={25}>25th of the month</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSavingProfile ? 'Saving Changes...' : 'Save Profile Baseline'}</span>
            </button>
          </form>

          {/* Stash Avatar & Rewards Summary Card */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                <AvatarDisplay
                  gender={user?.avatarConfig?.gender || 'man'}
                  equipped={user?.avatarConfig?.equipped || {}}
                  size="sm"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Avatar & Stash Points</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Balance: <strong className="text-amber-700 font-extrabold">{user?.rewardPoints || 0} pts</strong>
                </p>
              </div>
            </div>

            <Link
              to="/sprints"
              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-200 transition shrink-0"
            >
              Style in Sprints →
            </Link>
          </div>

          {/* Account Logout / Session Card */}
          {onLogout && (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Sign Out of Stash</span>
                <span className="text-[11px] text-slate-500">End your active session securely</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. EXTRA MONTHLY INCOME & ALLOWANCE TOP-UP LOGGER */}
        <div className="space-y-6">
          
          {/* Add Income Form Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Record Extra Funds Received</h2>
                <p className="text-xs text-slate-500">Money from grandparents, competition prizes, freelance, etc.</p>
              </div>
            </div>

            <form onSubmit={handleIncomeSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Description</label>
                <input
                  type="text"
                  required
                  value={incomeTitle}
                  onChange={(e) => setIncomeTitle(e.target.value)}
                  placeholder="e.g. Gift from Grandparents, Hackathon Award"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    placeholder="2500"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Source Category</label>
                  <select
                    value={incomeCategory}
                    onChange={(e) => setIncomeCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-700"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingIncome}
                className="btn-primary w-full"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Credit to Available Cash</span>
              </button>
            </form>
          </div>

          {/* Logged Extra Funds Table */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Monthly Extra Funds Log ({incomes.length})</h3>
              <span className="text-xs font-bold text-emerald-700">
                Total Extra: {formatCurrency(incomes.reduce((acc, i) => acc + (i.amount || 0), 0))}
              </span>
            </div>

            {incomes.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">
                No extra funds logged for this cycle yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
                {incomes.map((inc) => (
                  <div
                    key={inc._id}
                    className="py-2.5 flex items-center justify-between hover:bg-slate-50/50 px-2 rounded-lg transition"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-xs text-slate-900">{inc.title}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {inc.sourceCategory}
                        </span>
                        <span>•</span>
                        <span>{new Date(inc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xs text-emerald-700">+{formatCurrency(inc.amount)}</span>
                      <button
                        onClick={() => onDeleteIncome(inc._id)}
                        className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

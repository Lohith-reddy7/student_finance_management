import React, { useState, useEffect } from 'react';
import { AlertCircle, PlusCircle, ArrowRight, Bot, CreditCard, WalletCards, ArrowDownRight, Calendar, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cleanDisplayText, formatCurrency } from '../lib/format';

interface DashboardProps {
  user: any;
  incomes: any[];
  transactions: any[];
  prediction: any;
  onAddTransaction: (rawText: string) => Promise<boolean>;
  onSetMonthlyAllowance?: (amount: number, addToBalance: boolean) => Promise<boolean>;
  balance: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  incomes,
  transactions,
  prediction,
  onAddTransaction,
  onSetMonthlyAllowance,
  balance
}) => {
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // Month & Allowance Cycle Check
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonthStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;
  const currentMonthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Only prompt on the designated allowance cycle day (e.g. 1st of month)
  const allowanceCycleDay = user?.allowanceCycleDay || 1;
  const isAllowanceDay = now.getDate() === allowanceCycleDay;
  const alreadyConfirmedThisMonth = user?.lastAllowanceMonth === currentMonthStr;
  const promptDismissedKey = `stash_allowance_prompt_${currentMonthStr}`;

  // Monthly allowance modal state (kept OUTSIDE the .dashboard-page grid to preserve layout)
  const [showModal, setShowModal] = useState<boolean>(false);
  const [allowanceInput, setAllowanceInput] = useState<number>(user?.allowanceAmount || 8000);
  const [addToBalance, setAddToBalance] = useState<boolean>(true);
  const [isSavingAllowance, setIsSavingAllowance] = useState(false);
  const [allowanceSuccess, setAllowanceSuccess] = useState(false);

  // Auto-prompt ONLY on the allowance reset day, only if not yet confirmed, and not already dismissed in this browser
  useEffect(() => {
    if (user?.allowanceAmount !== undefined) {
      setAllowanceInput(user.allowanceAmount);
    }
    const isDismissed = localStorage.getItem(promptDismissedKey) === 'true';
    if (user && isAllowanceDay && !alreadyConfirmedThisMonth && !isDismissed) {
      setShowModal(true);
    }
  }, [user, isAllowanceDay, alreadyConfirmedThisMonth, promptDismissedKey]);

  const handleDismissModal = () => {
    localStorage.setItem(promptDismissedKey, 'true');
    setShowModal(false);
  };

  const sampleTexts = [
    'Paid Rs 240 to SWIGGY UPI ref 49102',
    'Debited INR 85.00 for UBER TRIP bangalore',
    'Paid 450 for Textbooks at Campus Bookstore',
    'Paid Rs 190 to ZOMATO via UPI'
  ];

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;
    setIsParsing(true);
    try {
      const saved = await onAddTransaction(rawText);
      if (saved) setRawText('');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveAllowance = async () => {
    if (!onSetMonthlyAllowance) return;
    setIsSavingAllowance(true);
    const success = await onSetMonthlyAllowance(Number(allowanceInput) || 0, addToBalance);
    setIsSavingAllowance(false);
    if (success) {
      localStorage.setItem(promptDismissedKey, 'true');
      setAllowanceSuccess(true);
      setTimeout(() => {
        setAllowanceSuccess(false);
        setShowModal(false);
      }, 1500);
    }
  };

  const isCritical = prediction.risk_level === 'CRITICAL';

  // STRICT CURRENT MONTH FILTER: Dashboard only displays transactions of this active month
  const currentMonthTransactions = transactions.filter((tx) => {
    const rawDate = tx.date || tx.createdAt;
    if (!rawDate) return false;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
  });

  const currentMonthIncomes = incomes.filter((inc) => {
    const rawDate = inc.date || inc.createdAt;
    if (!rawDate) return false;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
  });

  const trackedExpensesThisMonth = currentMonthTransactions.reduce((total, tx) => total + (Number(tx.amount) || 0), 0);
  const extraIncomeThisMonth = currentMonthIncomes.reduce((total, inc) => total + (Number(inc.amount) || 0), 0);
  const totalMoneyThisMonth = Number(user?.allowanceAmount || 0) + extraIncomeThisMonth;
  // Strictly enforce: Balance = Total Money - Expenses
  const effectiveBalance = Math.max(0, totalMoneyThisMonth - trackedExpensesThisMonth);

  const categoryClass = (category: string) => {
    if (category === 'Food & Dining') return 'category-food';
    if (category === 'Transport & Travel') return 'category-transport';
    if (category === 'Academics & Books') return 'category-academics';
    if (category === 'Entertainment & Subs') return 'category-entertainment';
    if (category === 'Rent & Housing') return 'category-rent';
    if (category === 'Shopping & Essentials') return 'category-shopping';
    return 'category-misc';
  };

  return (
    <>
      {/* 
        NOTE: .dashboard-page CSS relies on exact nth-child ordering (1 to 6).
        DO NOT insert additional direct children into .dashboard-page!
      */}
      <div className="dashboard-page space-y-6">

        {/* CHILD 1: INTRO BANNER */}
        <div className="dashboard-intro">
          <div>
            <p className="eyebrow">Personal finance overview</p>
            <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0] || 'there'}</h1>
            <p className="page-subtitle">Here is the clearest view of your student money today.</p>

            {/* Active Month Allowance Pill */}
            <div className="flex items-center gap-2 mt-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>{currentMonthName} Allowance: <strong>{formatCurrency(user?.allowanceAmount || 8000)}</strong></span>
              </span>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>
          </div>
          <Link to="/transactions" className="btn-secondary hidden sm:inline-flex">
            <span>View ledger</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        
        {/* CHILD 2: ZERO-BALANCE FORECAST ALERT BANNER */}
        <div className={`forecast-card p-6 rounded-2xl border ${
          isCritical 
            ? 'forecast-critical bg-amber-50/70 border-amber-200 text-amber-900' 
            : 'forecast-steady'
        } shadow-xs`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={`forecast-icon p-3 rounded-xl ${
                isCritical ? 'bg-amber-100 text-amber-700' : ''
              } shrink-0 mt-0.5`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`forecast-label text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    isCritical ? 'bg-amber-200/80 text-amber-800' : ''
                  }`}>
                    Budget Runway Forecast
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Estimated Zero-Balance Date</span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1 tracking-tight">
                  Projected Zero Date: <span className={isCritical ? 'text-amber-700' : 'forecast-date'}>
                    {prediction.zero_balance_date_formatted || 'End of Month'}
                  </span>
                </h2>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed font-normal">
                  {cleanDisplayText(prediction.insight_msg || 'Monitor your daily spending velocity to ensure your cash lasts until your next allowance cycle.')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CHILD 3: DEDICATED ACTION CARD (AI ADVISOR) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0" style={{ background: 'var(--soft)', borderColor: 'var(--line)', color: 'var(--ink)' }}>
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Personal AI Money Advisor</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
                Ask questions about your spending ("Did I spend more on transport this week compared to last?") with fact-checked transaction citations.
              </p>
            </div>
          </div>

          <Link
            to="/advisor"
            className="btn-secondary w-full sm:w-auto shrink-0"
          >
            <span>Consult AI Advisor</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* CHILD 4: KEY METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Card 1: Balance (Total Money - Expenses) */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Balance</span>
              <CreditCard className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(effectiveBalance)}</div>
            <p className="text-[11px] text-slate-500">Available cash right now</p>
          </div>

          {/* Card 2: Total Money */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Total Money</span>
              <WalletCards className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(totalMoneyThisMonth)}</div>
            <p className="text-[11px] text-slate-500">Allowance + extra funds this month</p>
          </div>

          {/* Card 3: Expenses */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-rose-700 font-semibold uppercase tracking-wider">Expenses</span>
              <ArrowDownRight className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(trackedExpensesThisMonth)}</div>
            <p className="text-[11px] text-slate-500">{currentMonthTransactions.length} {currentMonthTransactions.length === 1 ? 'expense' : 'expenses'} tracked in {currentMonthName.split(' ')[0]}</p>
          </div>

        </div>

        {/* CHILD 5: QUICK TRANSACTION ENTRY CARD */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Quick Transaction Entry</h3>
            <p className="text-xs text-slate-500 mt-0.5">Paste bank SMS notifications or UPI strings for automatic categorization</p>
          </div>

          <form onSubmit={handlePasteSubmit} className="flex gap-2">
            <input
              type="text"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="e.g. Paid Rs 240 to SWIGGY UPI ref 49102"
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700 text-xs font-mono"
            />
            <button
              type="submit"
              disabled={isParsing}
              className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center gap-2 shrink-0 disabled:opacity-50 transition shadow-xs"
            >
              {isParsing ? 'Processing...' : 'Categorize & Add'}
              <PlusCircle className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-500 font-medium">Sample notifications:</span>
            {sampleTexts.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setRawText(sample)}
                className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition font-mono"
              >
                "{sample}"
              </button>
            ))}
          </div>
        </div>

        {/* CHILD 6: RECENT TRANSACTIONS STREAM (STRICTLY THIS MONTH ONLY) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Recent Transactions ({currentMonthName.split(' ')[0]})
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Showing this month's activity ({currentMonthTransactions.length} of {transactions.length} total)
              </p>
            </div>
            <Link to="/transactions" className="text-xs font-semibold text-blue-700 hover:underline">
              View All ({transactions.length})
            </Link>
          </div>

          {currentMonthTransactions.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl space-y-1.5">
              <p className="text-xs font-medium text-slate-600">No transactions recorded for {currentMonthName.split(' ')[0]} yet.</p>
              <p className="text-[11px] text-slate-400">Previous months' transactions remain safely stored in your ledger.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {currentMonthTransactions.slice(0, 5).map((tx) => (
                <div
                  key={tx._id}
                  className="py-3 flex items-center justify-between hover:bg-slate-50/50 px-2 rounded-lg transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                      {tx.merchant ? tx.merchant[0] : 'T'}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-slate-900">{tx.merchant}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className={`category-badge ${categoryClass(tx.category)}`}>
                          {tx.category}
                        </span>
                        <span>•</span>
                        <span>{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-xs text-slate-900">-{formatCurrency(tx.amount)}</div>
                    {tx.autoTagged && (
                      <span className="text-[10px] text-slate-400 font-medium">Auto-Categorized</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 
        MONTHLY ALLOWANCE MODAL DIALOG
        Rendered outside .dashboard-page grid so layout is 100% preserved
      */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      Monthly Check-In
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">{currentMonthName}</span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    Set Allowance for {currentMonthName}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Student pocket money and allowances fluctuate each month. Confirm your allowance for <strong>{currentMonthName}</strong> so your runway forecast and daily limits stay accurate.
            </p>

            {allowanceSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{currentMonthName} allowance updated successfully!</span>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    {currentMonthName} Allowance Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={allowanceInput}
                      onChange={(e) => setAllowanceInput(Math.max(0, Number(e.target.value)))}
                      placeholder="e.g. 8000"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold focus:outline-none focus:border-blue-700 font-mono"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={addToBalance}
                    onChange={(e) => setAddToBalance(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0"
                  />
                  <span>Credit this amount to my current available cash</span>
                </label>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isSavingAllowance}
                    onClick={handleSaveAllowance}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition shadow-xs disabled:opacity-50"
                  >
                    {isSavingAllowance ? 'Saving...' : `Save ${currentMonthName.split(' ')[0]} Allowance`}
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissModal}
                    className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition"
                  >
                    Later
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

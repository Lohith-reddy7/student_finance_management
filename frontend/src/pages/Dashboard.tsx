import React, { useState } from 'react';
import { AlertCircle, PlusCircle, ArrowRight, UserCheck, Bot, CreditCard, WalletCards, ArrowDownRight, PiggyBank } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cleanDisplayText, formatCurrency } from '../lib/format';

interface DashboardProps {
  user: any;
  incomes: any[];
  transactions: any[];
  prediction: any;
  onAddTransaction: (rawText: string) => Promise<boolean>;
  balance: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  incomes,
  transactions,
  prediction,
  onAddTransaction,
  balance
}) => {
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const sampleTexts = [
    'Paid Rs 240 to SWIGGY UPI ref 49102',
    'Debited INR 85.00 for UBER TRIP bangalore',
    'Paid 450 for Textbooks at Campus Bookstore',
    'Paid Rs 190 to ZOMATO via UPI'
  ];

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;
    setIsParsing(true);
    setTimeout(async () => {
      const saved = await onAddTransaction(rawText);
      if (saved) setRawText('');
      setIsParsing(false);
    }, 300);
  };

  const isCritical = prediction.risk_level === 'CRITICAL';
  const trackedExpenses = transactions.reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
  const extraIncome = incomes.reduce((total, income) => total + Number(income.amount || 0), 0);
  const totalIncome = Number(user?.allowanceAmount || 0) + extraIncome;
  const trackedSavings = totalIncome - trackedExpenses;
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
    <div className="dashboard-page space-y-6">

      <div className="dashboard-intro">
        <div>
          <p className="eyebrow">Personal finance overview</p>
          <h1 className="page-title">Good morning, {user?.name?.split(' ')[0] || 'there'}</h1>
          <p className="page-subtitle">Here is the clearest view of your student money today.</p>
        </div>
        <Link to="/transactions" className="btn-secondary hidden sm:inline-flex">
          <span>View ledger</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      
      {/* 1. ZERO-BALANCE FORECAST ALERT BANNER */}
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

      {/* 2. DEDICATED ACTION CARD (AI ADVISOR) */}
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

      {/* 3. KEY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Available Cash */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Balance</span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(balance)}</div>
          <p className="text-[11px] text-slate-500">Available cash right now</p>
        </div>

        {/* Card 2: Income */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Income</span>
            <WalletCards className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(totalIncome)}</div>
          <p className="text-[11px] text-slate-500">Allowance and extra funds</p>
        </div>

        {/* Card 3: Expenses */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Expenses</span>
            <ArrowDownRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(trackedExpenses)}</div>
          <p className="text-[11px] text-slate-500">Recorded in your ledger</p>
        </div>

        {/* Card 4: Savings */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Savings</span>
            <PiggyBank className="w-4 h-4 text-slate-400" />
          </div>
          <div className={`text-2xl font-black ${trackedSavings >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {trackedSavings < 0 ? '-' : ''}{formatCurrency(trackedSavings)}
          </div>
          <p className="text-[11px] text-slate-500">Income less recorded expenses</p>
        </div>

      </div>

      {/* 4. QUICK TRANSACTION ENTRY CARD */}
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

      {/* 5. RECENT TRANSACTIONS STREAM */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Recent Transactions</h3>
          <Link to="/transactions" className="text-xs font-semibold text-blue-700 hover:underline">
            View All ({transactions.length})
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl space-y-1.5">
            <p className="text-xs font-medium text-slate-600">No transactions recorded yet.</p>
            <p className="text-[11px] text-slate-400">Enter a bank SMS string above to log your first transaction.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.slice(0, 5).map((tx) => (
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
  );
};

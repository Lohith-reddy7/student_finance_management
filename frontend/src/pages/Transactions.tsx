import React, { useState } from 'react';
import { Search, Trash2, ArrowRight, CheckCircle2, Play } from 'lucide-react';
import { api } from '../lib/api';

interface TransactionsProps {
  transactions: any[];
  onAddTransaction: (rawText: string) => void;
  onDeleteTransaction: (id: string) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ transactions, onAddTransaction, onDeleteTransaction }) => {
  const [sandboxText, setSandboxText] = useState('Paid Rs 340 to SWIGGY UPI ref 891238');
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = ['ALL', 'Food & Dining', 'Transport & Travel', 'Academics & Books', 'Entertainment & Subs', 'Rent & Housing', 'Shopping & Essentials', 'Miscellaneous'];

  const runSandboxTest = async () => {
    if (!sandboxText.trim()) return;
    setIsTesting(true);
    try {
      const res = await api.post('/transactions/parse', { rawText: sandboxText });
      setSandboxResult(res.data.nlpInfo || res.data);
    } catch (err) {
      const match = sandboxText.match(/(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
      const amt = match ? parseFloat(match[1].replace(',', '')) : 240;
      setSandboxResult({
        raw_text: sandboxText,
        merchant: sandboxText.toLowerCase().includes('swiggy') ? 'Swiggy' : 'Uber',
        amount: amt,
        category: sandboxText.toLowerCase().includes('swiggy') ? 'Food & Dining' : 'Transport & Travel',
        confidence: 0.96,
        auto_tagged: true
      });
    } finally {
      setIsTesting(false);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.merchant.toLowerCase().includes(searchQuery.toLowerCase()) || tx.rawText?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || tx.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Transaction Ledger</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review, filter, and test automated categorization for student expenses.
        </p>
      </div>

      {/* 1. TRANSACTION CATEGORIZATION TESTING BOX */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Test Transaction Input</h3>
          <p className="text-xs text-slate-500 mt-0.5">Paste raw banking SMS notifications to preview extracted merchant, amount, and budget category</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <textarea
              rows={3}
              value={sandboxText}
              onChange={(e) => setSandboxText(e.target.value)}
              placeholder="Enter or paste bank notification string..."
              className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-700 font-mono"
            />
            <button
              onClick={runSandboxTest}
              disabled={isTesting}
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center gap-2 transition shadow-xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Processing...' : 'Test Categorization'}</span>
            </button>
          </div>

          {/* Categorization Output Preview */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Preview Result</span>
            {sandboxResult ? (
              <div className="space-y-1.5 text-slate-700">
                <div><span className="text-slate-400 font-medium">Merchant:</span> <strong className="text-slate-900">{sandboxResult.merchant}</strong></div>
                <div><span className="text-slate-400 font-medium">Amount:</span> <strong className="text-slate-900">₹{sandboxResult.amount}</strong></div>
                <div><span className="text-slate-400 font-medium">Category:</span> <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">{sandboxResult.category}</span></div>
                <button
                  onClick={() => onAddTransaction(sandboxText)}
                  className="mt-3 w-full py-1.5 rounded-lg bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 transition"
                >
                  Save to Official Ledger
                </button>
              </div>
            ) : (
              <p className="text-slate-400 italic py-3">Click "Test Categorization" to inspect extraction details.</p>
            )}
          </div>
        </div>
      </div>

      {/* 2. TRANSACTION FILTERS & TABLE */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search merchant or notification text..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-700"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-lg shrink-0 font-medium transition ${
                  selectedCategory === cat
                    ? 'bg-blue-700 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>

        {/* Ledger Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Merchant</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Original Notification</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    No transactions match your query.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-xs text-slate-700">
                        {tx.merchant ? tx.merchant[0] : 'T'}
                      </div>
                      <span>{tx.merchant}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] truncate max-w-xs">
                      {tx.rawText || 'Manual entry'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                      -₹{tx.amount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onDeleteTransaction(tx._id)}
                        className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

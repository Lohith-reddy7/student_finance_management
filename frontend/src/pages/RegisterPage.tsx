import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Wallet, Calendar, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

interface RegisterPageProps {
  onLoginSuccess: (user: any, accessToken: string, refreshToken: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onLoginSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [allowanceAmount, setAllowanceAmount] = useState('8000');
  const [currentBalance, setCurrentBalance] = useState('3500');
  const [allowanceCycleDay, setAllowanceCycleDay] = useState('1');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/register', {
        name,
        email,
        password,
        allowanceAmount: parseFloat(allowanceAmount),
        currentBalance: parseFloat(currentBalance),
        allowanceCycleDay: parseInt(allowanceCycleDay)
      });

      const { user, accessToken, refreshToken } = res.data;
      onLoginSuccess(user, accessToken, refreshToken);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-8">
      
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-blue-700 flex items-center justify-center text-white font-black text-xl shadow-xs">
          ₹
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">STASH</h1>
          <p className="text-xs text-slate-500">Student Budget Onboarding</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">Create Student Profile</h2>
          <p className="text-xs text-slate-500">Set up your credentials and monthly allowance baseline</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Section 1: Credentials */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              1. Account Credentials
            </span>
            
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivers"
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@campus.edu"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Financial Baseline */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              2. Monthly Financial Baseline
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Monthly Allowance (₹)</label>
                <div className="relative">
                  <Wallet className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="number"
                    required
                    min={0}
                    value={allowanceAmount}
                    onChange={(e) => setAllowanceAmount(e.target.value)}
                    placeholder="8000"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Available Cash Now (₹)</label>
                <div className="relative">
                  <Wallet className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="number"
                    required
                    min={0}
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(e.target.value)}
                    placeholder="3500"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Allowance Reset Day of Month</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <select
                  value={allowanceCycleDay}
                  onChange={(e) => setAllowanceCycleDay(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-700"
                >
                  <option value="1">1st of the month</option>
                  <option value="5">5th of the month</option>
                  <option value="10">10th of the month</option>
                  <option value="15">15th of the month</option>
                  <option value="25">25th of the month</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-xs disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating Profile...' : 'Complete Profile Setup'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Already registered?{' '}
          <Link to="/login" className="text-blue-700 font-semibold hover:underline">
            Sign In Here
          </Link>
        </div>
      </div>

    </div>
  );
};

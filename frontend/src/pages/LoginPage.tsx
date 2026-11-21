import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

interface LoginPageProps {
  onLoginSuccess: (user: any, accessToken: string, refreshToken: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = res.data;
      
      onLoginSuccess(user, accessToken, refreshToken);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell flex-col">
      
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="auth-brand-mark">
          ₹
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">STASH</h1>
          <p className="text-xs text-slate-500">Student Budget & Runway Portal</p>
        </div>
      </div>

      {/* Card */}
      <div className="auth-card p-6 sm:p-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
          <p className="text-xs text-slate-500">Access your budget records and runway forecasts</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-xs disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-700 font-semibold hover:underline">
            Register Student Profile
          </Link>
        </div>
      </div>

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api, clearAuthTokens } from '../lib/api';

interface LoginPageProps {
  onLoginSuccess: (user: any, accessToken: string, refreshToken: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Clear any stale tokens when arriving on the login page to avoid expired token conflicts
  useEffect(() => {
    clearAuthTokens();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Read directly from DOM form elements to reliably handle browser autofill & password managers
    const form = e.currentTarget;
    const emailEl = form.querySelector<HTMLInputElement>('input[name="email"]');
    const passwordEl = form.querySelector<HTMLInputElement>('input[name="password"]');

    const cleanEmail = (emailEl?.value || email || '').trim().toLowerCase();
    const cleanPassword = (passwordEl?.value || password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email: cleanEmail, password: cleanPassword });
      const { user, accessToken, refreshToken } = res.data;
      
      onLoginSuccess(user, accessToken, refreshToken);
      navigate('/');
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message && err.message.toLowerCase().includes('network')) {
        setError('Cannot connect to authentication service. Please check your network connection.');
      } else {
        setError('Login attempt failed. Please verify your credentials and try again.');
      }
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

        <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
          <div>
            <label htmlFor="login-email" className="text-xs font-semibold text-slate-700 mb-1 block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="text-xs font-semibold text-slate-700 mb-1 block">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
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

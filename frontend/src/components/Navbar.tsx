import React from 'react';
import { Wallet, LogOut, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NavbarProps {
  user: any;
  balance: number;
  allowance: number;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, balance, allowance, onLogout }) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 px-6 py-3.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white font-black text-lg shadow-sm">
            ₹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                STASH
              </span>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                Student Finance
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Budgeting & Runway Forecast</p>
          </div>
        </Link>

        {/* User Balance & Account Info */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg">
            <Wallet className="w-4 h-4 text-blue-700" />
            <span className="text-xs text-slate-600 font-medium">Available Cash:</span>
            <span className="text-sm font-bold text-slate-900">₹{balance.toLocaleString('en-IN')}</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs text-slate-500">₹{allowance.toLocaleString('en-IN')}</span>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              {/* Profile Navigation Button */}
              <Link
                to="/profile"
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition"
                title="View Profile & Settings"
              >
                <div className="w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-[10px]">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span className="hidden md:inline">{user.name}</span>
              </Link>

              <button
                onClick={onLogout}
                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 border border-transparent hover:border-red-100 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

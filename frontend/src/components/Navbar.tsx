import React from 'react';
import { Wallet, LogOut, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NavbarProps {
  user: any;
  balance: number;
  allowance: number;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, balance, allowance, onLogout }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--line)] bg-[var(--surface)]/95 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="app-content flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-lg font-black text-white shadow-sm">
            ₹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="brand-heading text-xl font-extrabold tracking-tight text-[var(--ink)]">
                STASH
              </span>
              <span className="hidden rounded-full border border-[var(--line)] bg-[var(--soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)] sm:inline">Student Finance</span>
            </div>
            <p className="hidden text-xs text-[var(--muted)] sm:block">Budgeting & runway forecast</p>
          </div>
        </Link>

        {/* User Balance & Account Info */}
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-4 py-2 sm:flex">
            <Wallet className="h-4 w-4 text-[var(--accent)]" />
            <span className="text-xs font-medium text-[var(--muted)]">Available cash</span>
            <span className="text-sm font-bold text-[var(--ink)]">₹{balance.toLocaleString('en-IN')}</span>
            <span className="text-[var(--line)]">/</span>
            <span className="text-xs text-[var(--muted)]">₹{allowance.toLocaleString('en-IN')}</span>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              {/* Profile Navigation Button */}
              <button className="hidden h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--muted)] transition hover:bg-[var(--soft)] sm:flex" title="Notifications">
                <Bell className="h-4 w-4" />
              </button>
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-2.5 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] sm:px-3.5"
                title="View Profile & Settings"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span className="hidden md:inline">{user.name}</span>
              </Link>

              <button
                onClick={onLogout}
                className="rounded-lg border border-transparent p-2 text-[var(--muted)] transition hover:border-red-100 hover:bg-red-50 hover:text-red-600"
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

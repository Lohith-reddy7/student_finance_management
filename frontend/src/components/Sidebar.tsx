import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, UserCircle, Bot, HelpCircle } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/transactions', label: 'Transaction Ledger', icon: ReceiptText },
    { path: '/advisor', label: 'AI Money Advisor', icon: Bot },
    { path: '/profile', label: 'Profile & Extra Income', icon: UserCircle },
  ];

  return (
    <aside className="nav-panel formal-card h-fit p-3 md:sticky md:top-24">
      <div className="nav-list space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[.14em] text-[var(--muted)]">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'nav-link-active bg-[var(--accent-soft)] text-[var(--accent-dark)] font-semibold border border-[var(--subtle-line)]'
                    : 'text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--ink)]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Formal Information Card */}
      <div className="student-tip mt-7 space-y-1.5 rounded-xl border border-[var(--line)] bg-[var(--soft)] p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--ink)]">
          <HelpCircle className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>Student Tip</span>
        </div>
        <p className="text-xs leading-relaxed text-[var(--muted)]">
          Ask the AI Advisor to compare your weekly expenses or verify if you can afford upcoming purchases.
        </p>
      </div>
    </aside>
  );
};

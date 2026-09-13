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
    <aside className="w-full md:w-64 bg-white border border-slate-200 rounded-2xl p-4 shrink-0 shadow-sm h-fit">
      <div className="space-y-1.5">
        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
      <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
        <div className="flex items-center gap-2 text-slate-700 text-xs font-bold">
          <HelpCircle className="w-3.5 h-3.5 text-blue-700" />
          <span>Student Tip</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Ask the AI Advisor to compare your weekly expenses or verify if you can afford upcoming purchases.
        </p>
      </div>
    </aside>
  );
};

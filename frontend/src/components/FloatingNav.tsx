'use client';

import { History, Home, Settings, UserRound } from 'lucide-react';

const navItems = [
  { label: 'Home', icon: Home, active: true },
  { label: 'History', icon: History, active: false },
  { label: 'Profile', icon: UserRound, active: false },
  { label: 'Settings', icon: Settings, active: false },
];

export default function FloatingNav() {
  return (
    <nav className="flex items-center gap-1.5 rounded-full border border-white/40 bg-white/40 p-1.5 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40 dark:ring-white/10">
      {navItems.map(({ label, icon: Icon, active }) => (
        <button
          key={label}
          type="button"
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 ${
            active
              ? 'bg-white text-sky-600 shadow-md dark:bg-slate-800 dark:text-sky-300'
              : 'text-slate-500 hover:bg-white/40 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
          }`}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

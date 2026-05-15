'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = window.localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = savedTheme ? savedTheme === 'dark' : prefersDark;

    setIsDark(initialDark);
    document.documentElement.classList.toggle('dark', initialDark);
  }, []);

  const toggleTheme = () => {
    const nextIsDark = !isDark;

    setIsDark(nextIsDark);
    document.documentElement.classList.toggle('dark', nextIsDark);
    window.localStorage.setItem('theme', nextIsDark ? 'dark' : 'light');
  };

  if (!mounted) {
    return (
      <div className="h-12 w-44 animate-pulse rounded-full bg-slate-200/50 dark:bg-slate-800/50" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="group relative flex h-12 w-44 items-center rounded-full border border-white/40 bg-white/40 p-1 shadow-lg ring-1 ring-black/5 backdrop-blur-md transition-all duration-500 hover:bg-white/60 dark:border-white/10 dark:bg-slate-900/40 dark:ring-white/10 dark:hover:bg-slate-900/60"
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-all duration-500 ${
          isDark
            ? 'translate-x-32 bg-slate-800 text-sky-400'
            : 'translate-x-0 bg-white text-orange-400'
        }`}
      >
        {isDark ? (
          <Moon className="h-5 w-5 fill-sky-400/20" />
        ) : (
          <Sun className="h-5 w-5 fill-orange-400/20" />
        )}
      </div>

      <span
        className={`absolute flex w-full items-center px-4 text-[10px] font-bold tracking-[0.2em] transition-all duration-500 ${
          isDark
            ? 'justify-start text-slate-400'
            : 'justify-end text-slate-500'
        }`}
      >
        {isDark ? 'DARK MODE' : 'LIGHT MODE'}
      </span>
    </button>
  );
}

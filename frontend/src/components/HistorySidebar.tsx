'use client';

import { useEffect, useState } from 'react';
import { History, Sparkles } from 'lucide-react';
import { HistoryItem } from '@/types';

interface Props {
  items: HistoryItem[];
  onSelect: (id: string) => void;
}

const severityDotClass: Record<string, string> = {
  low: 'bg-emerald-400',
  medium: 'bg-amber-400',
  high: 'bg-orange-400',
  critical: 'bg-rose-400',
};

export default function HistorySidebar({ items, onSelect }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatTime = (ts: string) => {
    if (!mounted) return '';
    try {
      const date = new Date(ts);

      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/30 bg-white/40 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/50">
      <div className="border-b border-white/20 px-5 py-4 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-sky-600 shadow-sm dark:bg-white/10 dark:text-sky-300">
            <History className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Analysis History</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Recent RCA sessions and saved findings.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300/80 bg-white/40 px-5 text-center dark:border-white/10 dark:bg-white/5">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No analyses yet</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Run a log analysis and it will show up here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className="group block w-full rounded-[24px] border border-white/50 bg-white/60 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${severityDotClass[item.severity] || 'bg-slate-400'}`}
                  />
                  <span>{formatTime(item.timestamp)}</span>
                </span>

                <span className="mt-3 block truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {item.detected_issue || item.input_summary}
                </span>

                <span className="mt-2 block text-xs font-medium uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                  Confidence {item.confidence_score}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

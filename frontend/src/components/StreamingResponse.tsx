'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

interface Step {
  step: number;
  title: string;
  status: 'pending' | 'running' | 'complete';
}

interface Props {
  steps: Step[];
  currentStep: number;
}

const stepConfig = [
  { label: 'Identify Services', color: '#3b82f6' },
  { label: 'Trace Dependencies', color: '#6366f1' },
  { label: 'Correlate Data', color: '#f59e0b' },
  { label: 'Search History', color: '#10b981' },
  { label: 'AI Analysis', color: '#8b5cf6' },
];

export default function StreamingResponse({ steps, currentStep }: Props) {
  const totalSteps = stepConfig.length;
  const completedCount = steps.filter(s => s.status === 'complete').length;
  const progressPercent = (completedCount / totalSteps) * 100;

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="flex h-4 w-4 items-center justify-center"
          >
            <Loader2 className="h-3.5 w-3.5 text-blue-400" />
          </motion.div>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
            SRE Analysis Pipeline
          </span>
        </div>
        <span className="text-[9px] font-mono text-slate-500">
          {completedCount}/{totalSteps}
        </span>
      </div>

      {/* Steps */}
      <div className="px-3 py-2 space-y-1">
        {stepConfig.map((config, i) => {
          const stepNum = i + 1;
          const step = steps.find(s => s.step === stepNum);
          const status = step?.status || (stepNum < currentStep ? 'complete' : stepNum === currentStep ? 'running' : 'pending');

          return (
            <div key={i} className="flex items-center gap-2.5 py-1">
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {status === 'complete' ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                    <CheckCircle2 className="h-3.5 w-3.5" style={{ color: config.color }} />
                  </motion.div>
                ) : status === 'running' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: config.color }} />
                ) : (
                  <Circle className="h-3 w-3 text-slate-600" />
                )}
              </div>

              {/* Label */}
              <span className={`text-[11px] font-medium flex-1 ${
                status === 'pending' ? 'text-slate-600' : status === 'running' ? 'text-slate-200' : 'text-slate-400'
              }`}>
                {step?.title?.replace(/\.{3}$/, '') || config.label}
              </span>

              {/* Status Dot */}
              {status === 'running' && (
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: config.color }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="px-3 pb-2">
        <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6)' }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}

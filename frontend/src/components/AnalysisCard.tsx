'use client';

import { useState } from 'react';
import { AnalysisResult } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Search, Link2, MapPin, FileText, Wrench,
  Code2, Shield, ChevronDown, Copy, Check, CircleAlert,
  CircleCheck, Flame, Zap, Target, BarChart3,
} from 'lucide-react';

const severityConfig = {
  low: { color: '#10b981', label: 'Low', icon: CircleCheck },
  medium: { color: '#f59e0b', label: 'Medium', icon: CircleAlert },
  high: { color: '#f97316', label: 'High', icon: AlertTriangle },
  critical: { color: '#ef4444', label: 'Critical', icon: Flame },
};

function ConfidenceBar({ score, color }: { score: string; color: string }) {
  const numericScore = parseInt(score) || 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${numericScore}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
      <span className="text-xs font-bold font-mono" style={{ color }}>{numericScore}%</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold text-slate-500 hover:text-white hover:bg-white/5 transition-colors border border-white/5">
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  accentColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ icon, title, accentColor, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-left hover:bg-white/3 transition-colors"
      >
        <div
          className="flex h-5 w-5 items-center justify-center rounded flex-shrink-0"
          style={{ background: `${accentColor}15` }}
        >
          {icon}
        </div>
        <span className="text-[11px] font-bold text-slate-300 flex-1">{title}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AnalysisCard({ result }: { result: AnalysisResult }) {
  const severity = severityConfig[result.severity] || severityConfig.medium;
  const SeverityIcon = severity.icon;

  const fixSteps = result.suggested_fix.split(/(?:\d+\.\s|\n-\s|\n•\s)/).map(s => s.trim()).filter(Boolean);
  const preventSteps = result.preventive_measures.split(/(?:\d+\.\s|\n-\s|\n•\s)/).map(s => s.trim()).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border overflow-hidden"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Header */}
      <div className="px-3 py-2.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded"
            style={{ background: `${severity.color}15` }}
          >
            <SeverityIcon className="h-4 w-4" style={{ color: severity.color }} />
          </div>
          <div>
            <span
              className="severity-badge text-[9px]"
              style={{ background: `${severity.color}15`, color: severity.color }}
            >
              {severity.label} Severity
            </span>
            <h3 className="text-xs font-bold text-white mt-0.5 leading-tight">Incident Analysis Report</h3>
          </div>
        </div>
        <div className="w-24">
          <div className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Confidence</div>
          <ConfidenceBar score={result.confidence_score} color={severity.color} />
        </div>
      </div>

      {/* Sections */}
      <div>
        {/* Summary */}
        <Section
          icon={<Search className="h-3 w-3 text-blue-400" />}
          title="🔍 Summary"
          accentColor="#3b82f6"
          defaultOpen={true}
        >
          <p className="text-xs text-slate-300 leading-relaxed">{result.detected_issue}</p>
        </Section>

        {/* Root Cause */}
        <Section
          icon={<MapPin className="h-3 w-3 text-rose-400" />}
          title="🧠 Root Cause"
          accentColor="#f43f5e"
          defaultOpen={true}
        >
          <div className="pl-3 border-l-2 border-rose-500/40">
            <p className="text-xs font-medium text-slate-200 leading-relaxed">{result.root_cause}</p>
          </div>
        </Section>

        {/* Evidence */}
        {result.evidence.length > 0 && (
          <Section
            icon={<FileText className="h-3 w-3 text-amber-400" />}
            title="📊 Evidence"
            accentColor="#f59e0b"
            defaultOpen={true}
          >
            <div className="space-y-1.5">
              {result.evidence.map((ev, i) => (
                <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded bg-white/3 border border-white/5">
                  <span className="flex-shrink-0 flex h-4 w-4 items-center justify-center rounded text-[8px] font-bold bg-amber-500/15 text-amber-400 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-[10px] font-mono text-slate-400 break-all leading-relaxed">{ev}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Affected Services */}
        {result.affected_services.length > 0 && (
          <Section
            icon={<Link2 className="h-3 w-3 text-indigo-400" />}
            title="🌐 Affected Services"
            accentColor="#6366f1"
            defaultOpen={true}
          >
            <div className="flex flex-wrap gap-1.5">
              {result.affected_services.map((svc, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/15">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  {svc}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Impact Level */}
        <Section
          icon={<Target className="h-3 w-3 text-orange-400" />}
          title="⚠️ Impact Level"
          accentColor="#f97316"
        >
          <div className="flex items-center gap-3">
            <span
              className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider"
              style={{ background: `${severity.color}15`, color: severity.color }}
            >
              {severity.label}
            </span>
            <span className="text-[10px] text-slate-400">
              {result.severity === 'critical' ? 'Complete outage / data loss risk' :
               result.severity === 'high' ? 'Major service degradation' :
               result.severity === 'medium' ? 'Partial impact on users' :
               'Minor issue, no user impact'}
            </span>
          </div>
        </Section>

        {/* Fix Suggestions */}
        <Section
          icon={<Wrench className="h-3 w-3 text-emerald-400" />}
          title="🛠 Fix Suggestions"
          accentColor="#10b981"
          defaultOpen={true}
        >
          <div className="space-y-2">
            {fixSteps.length > 1 ? (
              fixSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">{step}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed">{result.suggested_fix}</p>
            )}
          </div>
        </Section>

        {/* Code Fix */}
        {result.improved_code && result.improved_code.trim() && (
          <Section
            icon={<Code2 className="h-3 w-3 text-cyan-400" />}
            title="Code Fix"
            accentColor="#06b6d4"
            defaultOpen={true}
          >
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400">Suggested Code</span>
                <CopyButton text={result.improved_code} />
              </div>
              <pre className="overflow-x-auto rounded-md bg-black/40 p-3 text-[11px] leading-relaxed font-mono text-slate-300 border border-white/5">
                <code>{result.improved_code}</code>
              </pre>
            </div>
          </Section>
        )}

        {/* Prevent Recurrence */}
        <Section
          icon={<Shield className="h-3 w-3 text-violet-400" />}
          title="Prevent Recurrence"
          accentColor="#8b5cf6"
        >
          <div className="space-y-2">
            {preventSteps.length > 1 ? (
              preventSteps.map((step, i) => (
                <label key={i} className="flex items-start gap-2 cursor-pointer group">
                  <input type="checkbox" className="mt-0.5" />
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors leading-relaxed">{step}</span>
                </label>
              ))
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed">{result.preventive_measures}</p>
            )}
          </div>
        </Section>
      </div>
    </motion.div>
  );
}

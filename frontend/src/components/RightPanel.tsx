'use client';

import { useSREStore } from '@/lib/store';
import { useMemo } from 'react';
import {
  Activity, ArrowUpRight, ArrowDownRight, Minus,
  Clock, AlertTriangle, Server,
} from 'lucide-react';
import type { ServiceHealth } from '@/types';

const HEALTH_LABELS: Record<ServiceHealth, { label: string; className: string }> = {
  healthy: { label: 'Healthy', className: 'text-emerald-400' },
  degraded: { label: 'Degraded', className: 'text-amber-400' },
  down: { label: 'Down', className: 'text-red-400' },
};

/* ═══ Mini Dependency Map ═══ */
function DependencyMap() {
  const services = useSREStore((s) => s.services);
  const lastAnalysis = useSREStore((s) => s.lastAnalysis);

  const affectedSet = useMemo(
    () => new Set(lastAnalysis?.affected_services?.map(s => s.toLowerCase()) || []),
    [lastAnalysis],
  );

  return (
    <div className="space-y-1">
      {/* Simple dependency visualization */}
      <div className="grid grid-cols-3 gap-1.5 py-2">
        {services.map((svc) => {
          const isAffected = affectedSet.has(svc.name.toLowerCase()) || affectedSet.has(svc.name);
          return (
            <div
              key={svc.name}
              className={`relative flex flex-col items-center gap-1 px-1.5 py-2 rounded border text-center transition-all ${
                isAffected
                  ? 'border-red-500/30 bg-red-500/5'
                  : 'border-white/5 bg-white/2 hover:bg-white/4'
              }`}
            >
              <div className={`health-dot ${svc.health}`} />
              <span className="text-[9px] font-bold text-slate-300 leading-tight truncate w-full">
                {svc.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </span>
              <span className="text-[8px] text-slate-500 font-mono">{svc.latency}ms</span>
            </div>
          );
        })}
      </div>

      {/* Connection Lines Legend */}
      <div className="flex items-center gap-3 px-1 pt-1">
        <div className="flex items-center gap-1">
          <div className="health-dot healthy" />
          <span className="text-[8px] text-slate-500">Healthy</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="health-dot degraded" />
          <span className="text-[8px] text-slate-500">Degraded</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="health-dot down" />
          <span className="text-[8px] text-slate-500">Down</span>
        </div>
      </div>
    </div>
  );
}

/* ═══ Right Panel ═══ */
export default function RightPanel() {
  const services = useSREStore((s) => s.services);
  const lastAnalysis = useSREStore((s) => s.lastAnalysis);

  const healthCounts = useMemo(() => {
    const counts = { healthy: 0, degraded: 0, down: 0 };
    services.forEach((s) => { counts[s.health]++; });
    return counts;
  }, [services]);

  return (
    <aside
      className="flex flex-col w-72 min-w-[260px] max-w-[300px] border-l flex-shrink-0 overflow-hidden"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">System Context</span>
        <Activity className="h-3 w-3 text-slate-500" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Health Summary */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Server className="h-3 w-3 text-slate-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Service Health</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 surface px-2.5 py-2 text-center">
              <div className="text-lg font-bold text-emerald-400">{healthCounts.healthy}</div>
              <div className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Healthy</div>
            </div>
            <div className="flex-1 surface px-2.5 py-2 text-center">
              <div className="text-lg font-bold text-amber-400">{healthCounts.degraded}</div>
              <div className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Degraded</div>
            </div>
            <div className="flex-1 surface px-2.5 py-2 text-center">
              <div className="text-lg font-bold text-red-400">{healthCounts.down}</div>
              <div className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Down</div>
            </div>
          </div>
        </div>

        {/* Service Topology / Dependency Map */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-3 w-3 text-slate-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Topology</span>
          </div>
          <DependencyMap />
        </div>

        {/* Real-Time Health List */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="h-3 w-3 text-slate-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Real-Time Status</span>
          </div>
          <div className="space-y-1">
            {services.map((svc) => {
              const healthInfo = HEALTH_LABELS[svc.health];
              const latencyTrend = svc.latency > 200 ? 'up' : svc.latency < 50 ? 'down' : 'stable';
              return (
                <div
                  key={svc.name}
                  className="flex items-center gap-2 px-2.5 py-2 rounded border transition-colors hover:bg-white/3"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div className={`health-dot ${svc.health}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-slate-300 truncate">{svc.name}</div>
                    <div className="text-[9px] text-slate-500 font-mono">
                      {svc.latency}ms • {svc.errorRate}% err
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-[9px] font-bold ${healthInfo.className}`}>
                      {healthInfo.label}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {latencyTrend === 'up' ? (
                        <ArrowUpRight className="h-2.5 w-2.5 text-red-400" />
                      ) : latencyTrend === 'down' ? (
                        <ArrowDownRight className="h-2.5 w-2.5 text-emerald-400" />
                      ) : (
                        <Minus className="h-2.5 w-2.5 text-slate-500" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Last Analysis Summary */}
        {lastAnalysis && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="h-3 w-3 text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Last Analysis</span>
            </div>
            <div className="surface px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`severity-badge ${lastAnalysis.severity}`}>
                  {lastAnalysis.severity}
                </span>
                <span className="text-[10px] font-bold text-blue-400 font-mono">
                  {lastAnalysis.confidence_score}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                {lastAnalysis.detected_issue}
              </p>
              {lastAnalysis.affected_services.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {lastAnalysis.affected_services.slice(0, 4).map((svc) => (
                    <span key={svc} className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-white/5 text-slate-400 border border-white/5">
                      {svc}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

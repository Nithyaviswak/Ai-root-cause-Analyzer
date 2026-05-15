'use client';

import { useSREStore } from '@/lib/store';
import {
  MessageSquare, AlertTriangle, Share2, BarChart3, Bell,
  Zap, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  ChevronDown, Circle,
} from 'lucide-react';
import type { NavTab, Environment, IncidentStatus } from '@/types';

const NAV_ITEMS: { id: NavTab; label: string; icon: typeof MessageSquare }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'topology', label: 'Topology', icon: Share2 },
  { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  { id: 'alerts', label: 'Alerts', icon: Bell },
];

const ENV_COLORS: Record<Environment, string> = {
  production: '#ef4444',
  staging: '#f59e0b',
  development: '#10b981',
};

const STATUS_COLORS: Record<IncidentStatus, string> = {
  investigating: '#ef4444',
  identified: '#f59e0b',
  monitoring: '#3b82f6',
  resolved: '#10b981',
};

export default function TopNavbar() {
  const {
    activeNav, setActiveNav,
    environment, setEnvironment,
    incidentStatus,
    leftPanelOpen, setLeftPanelOpen,
    rightPanelOpen, setRightPanelOpen,
  } = useSREStore();

  const envCycle: Environment[] = ['production', 'staging', 'development'];
  const cycleEnv = () => {
    const idx = envCycle.indexOf(environment);
    setEnvironment(envCycle[(idx + 1) % 3]);
  };

  return (
    <header
      className="flex h-11 items-center justify-between px-3 border-b flex-shrink-0 select-none"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
    >
      {/* LEFT: Logo + Nav */}
      <div className="flex items-center gap-3">
        {/* Panel Toggle */}
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Toggle input panel"
        >
          {leftPanelOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5" />}
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-white">
            <Zap className="h-3 w-3" />
          </div>
          <span className="text-xs font-bold text-white tracking-tight">
            SRE <span className="text-blue-400">COPILOT</span>
          </span>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-white/10" />

        {/* Nav Tabs */}
        <nav className="flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                activeNav === item.id
                  ? 'text-white bg-white/8'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/4'
              }`}
            >
              <item.icon className="h-3 w-3" />
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* RIGHT: Env + Status + Panel Toggle */}
      <div className="flex items-center gap-2">
        {/* Environment Switcher */}
        <button
          onClick={cycleEnv}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors hover:bg-white/4"
          style={{
            color: ENV_COLORS[environment],
            borderColor: `${ENV_COLORS[environment]}30`,
          }}
        >
          <Circle className="h-1.5 w-1.5 fill-current" />
          {environment.slice(0, 4)}
          <ChevronDown className="h-2.5 w-2.5 opacity-50" />
        </button>

        {/* Incident Badge */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: `${STATUS_COLORS[incidentStatus]}12`,
            color: STATUS_COLORS[incidentStatus],
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: STATUS_COLORS[incidentStatus] }}
          />
          {incidentStatus}
        </div>

        {/* Right Panel Toggle */}
        <button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Toggle context panel"
        >
          {rightPanelOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
        </button>
      </div>
    </header>
  );
}

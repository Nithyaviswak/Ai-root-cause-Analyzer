'use client';

import { useRef, useState, useCallback } from 'react';
import { useSREStore } from '@/lib/store';
import {
  FileText, BarChart3, GitBranch, Mic, Upload, Send, Rocket, Zap,
  Loader2, MicOff, Database, Globe,
} from 'lucide-react';
import type { InputTab } from '@/types';

const INPUT_TABS: { id: InputTab; label: string; icon: typeof FileText }[] = [
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  { id: 'traces', label: 'Traces', icon: GitBranch },
  { id: 'voice', label: 'Voice', icon: Mic },
];

const QUICK_CHIPS = [
  { label: 'Why is latency high?', icon: '⚡' },
  { label: 'Find root cause of 500 errors', icon: '🔍' },
  { label: 'Trace failure across services', icon: '🌐' },
];

const SAMPLE_LOG = `ERROR 2024-01-15T10:20:06Z payment-service Connection timeout to payment gateway stripe-prod-01 after 5000ms
ERROR 2024-01-15T10:20:16Z payment-service Payment gateway unreachable after 3 attempts. Circuit breaker OPEN
ERROR 2024-01-15T10:20:16Z order-service Payment failed for order #ORD-2024-8891: PaymentGatewayUnavailableException
CRITICAL 2024-01-15T10:20:55Z monitoring Payment processing completely halted. All payment gateways unreachable.
ERROR 2024-01-15T10:21:00Z order-service Database connection timeout: pool exhausted, 47 pending requests
ERROR 2024-01-15T10:21:05Z api-gateway Upstream service order-service returned 504 Gateway Timeout
CRITICAL 2024-01-15T10:21:10Z monitoring Cascading failure detected across payment-service, order-service, api-gateway
ERROR 2024-01-15T10:22:05Z network-monitor External egress via NAT gateway nat-gw-prod-01 showing 78% packet loss`;

interface LeftPanelProps {
  onAnalyze: (text?: string) => Promise<void>;
  onFileUpload: (file: File) => Promise<void>;
}

export default function LeftPanel({ onAnalyze, onFileUpload }: LeftPanelProps) {
  const {
    activeInputTab, setActiveInputTab,
    logInput, setLogInput,
    metricsInput, setMetricsInput,
    tracesInput, setTracesInput,
    isAnalyzing,
    voice, setVoice,
  } = useSREStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setIsUploading(true);
      onFileUpload(files[0]).finally(() => setIsUploading(false));
    }
  }, [onFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsUploading(true);
      onFileUpload(files[0]).finally(() => setIsUploading(false));
    }
  }, [onFileUpload]);

  const handleSubmit = () => {
    if (activeInputTab === 'voice') {
      onAnalyze(voice.transcript || voice.partialTranscript);
    } else {
      onAnalyze();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleVoice = () => {
    if (voice.isListening) {
      setVoice({ isListening: false });
    } else {
      setVoice({ isListening: true, partialTranscript: '', transcript: '' });
      // Simulate partial transcript for demo
      const phrases = ['investigating', 'investigating the payment', 'investigating the payment service timeout'];
      let i = 0;
      const interval = setInterval(() => {
        if (i < phrases.length) {
          setVoice({ partialTranscript: phrases[i] });
          i++;
        } else {
          setVoice({ isListening: false, transcript: phrases[phrases.length - 1], partialTranscript: '' });
          clearInterval(interval);
        }
      }, 800);
    }
  };

  const currentInput = activeInputTab === 'logs' ? logInput : activeInputTab === 'metrics' ? metricsInput : tracesInput;
  const setCurrentInput = activeInputTab === 'logs' ? setLogInput : activeInputTab === 'metrics' ? setMetricsInput : setTracesInput;
  const hasInput = activeInputTab === 'voice' ? !!(voice.transcript || voice.partialTranscript) : !!currentInput.trim();

  return (
    <aside
      className="flex flex-col w-80 min-w-[280px] max-w-[360px] border-r flex-shrink-0 overflow-hidden"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Input</span>
      </div>

      {/* Tab Bar */}
      <div className="px-3 pt-2">
        <div className="tab-bar">
          {INPUT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveInputTab(tab.id)}
              className={`tab-btn ${activeInputTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {activeInputTab === 'voice' ? (
          /* Voice Input */
          <div className="space-y-3">
            <div className="flex flex-col items-center gap-3 py-6">
              <button
                onClick={toggleVoice}
                className={`flex h-16 w-16 items-center justify-center rounded-full transition-all ${
                  voice.isListening
                    ? 'bg-red-500/20 border-2 border-red-500 text-red-400 animate-pulse'
                    : 'bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                }`}
              >
                {voice.isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </button>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {voice.isListening ? 'Listening...' : 'Click to start'}
              </span>

              {/* Waveform */}
              {voice.isListening && (
                <div className="voice-wave">
                  <div className="bar" /><div className="bar" /><div className="bar" /><div className="bar" /><div className="bar" />
                </div>
              )}
            </div>

            {/* Transcript */}
            {(voice.partialTranscript || voice.transcript) && (
              <div className="surface px-3 py-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Transcript</span>
                <p className="text-xs text-slate-300 font-mono leading-relaxed">
                  {voice.transcript || <span className="text-slate-500 italic">{voice.partialTranscript}...</span>}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Text Input */
          <>
            <textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeInputTab === 'logs'
                  ? 'Paste logs, error traces, or describe the issue...'
                  : activeInputTab === 'metrics'
                  ? 'Paste Prometheus metrics, JSON, or describe metrics...'
                  : 'Paste Jaeger traces, span data, or trace IDs...'
              }
              className="input-area"
              rows={8}
              disabled={isAnalyzing}
            />

            {/* Upload Zone */}
            <div
              className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".log,.txt,.json,.csv,.yaml,.yml"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-1 text-slate-500">
                {isUploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /><span className="text-[10px]">Uploading...</span></>
                ) : (
                  <><Upload className="h-4 w-4" /><span className="text-[10px]">Drop files or click</span></>
                )}
              </div>
            </div>
          </>
        )}

        {/* Quick Prompt Chips */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Quick Prompts</span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => { setLogInput(chip.label); setActiveInputTab('logs'); }}
                className="chip"
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sample Log Button */}
        <button
          onClick={() => { setLogInput(SAMPLE_LOG); setActiveInputTab('logs'); }}
          className="flex items-center gap-1.5 w-full px-3 py-2 rounded text-[11px] font-medium text-slate-400 hover:text-white hover:bg-white/5 border border-dashed border-white/10 transition-colors"
        >
          <Rocket className="h-3 w-3" />
          Load Sample Incident Logs
        </button>

        {/* Observability Integrations */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Integrations</span>
          <div className="space-y-1">
            {[
              { name: 'Prometheus', icon: Database, connected: false },
              { name: 'Grafana', icon: BarChart3, connected: false },
              { name: 'Jaeger', icon: Globe, connected: false },
            ].map((integration) => (
              <div
                key={integration.name}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] text-slate-500 border border-white/5 hover:border-white/10 cursor-pointer transition-colors"
              >
                <integration.icon className="h-3 w-3" />
                <span>{integration.name}</span>
                <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-slate-600">
                  {integration.connected ? '✓ Connected' : 'Connect'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          onClick={handleSubmit}
          disabled={isAnalyzing || !hasInput}
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-md text-xs font-bold transition-all ${
            isAnalyzing || !hasInput
              ? 'bg-white/5 text-slate-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20'
          }`}
        >
          {isAnalyzing ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing...</>
          ) : (
            <><Zap className="h-3.5 w-3.5" /> Run Analysis</>
          )}
        </button>
        <div className="text-center mt-1">
          <span className="text-[9px] text-slate-600">Ctrl+Enter to submit</span>
        </div>
      </div>
    </aside>
  );
}

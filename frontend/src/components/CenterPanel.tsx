'use client';

import { useRef, useEffect, useState } from 'react';
import { useSREStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, UserRound, Pin, PinOff, FileDown, Send, ChevronDown,
  Sparkles, Rocket, Copy, Check,
} from 'lucide-react';
import type { AnalysisResult } from '@/types';
import AnalysisCard from './AnalysisCard';
import StreamingResponse from './StreamingResponse';

interface CenterPanelProps {
  onAnalyze: (text?: string) => Promise<void>;
  onFollowUp: (question: string) => Promise<void>;
  onGenerateReport: (analysis: AnalysisResult) => Promise<void>;
}

/* ═══ Markdown Renderer ═══ */
function RenderMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let codeBlock = false;
  let codeContent = '';
  let codeLang = '';
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key} className="space-y-1 my-2 ml-1">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
              <span className="flex-shrink-0 mt-1.5 h-1 w-1 rounded-full bg-blue-500/60" />
              <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const formatInline = (text: string): string => {
    return text
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-white/5 text-[11px] font-mono text-cyan-400">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (codeBlock) {
        elements.push(
          <div key={`code-${i}`} className="my-2 rounded-md overflow-hidden border border-white/5">
            {codeLang && (
              <div className="px-3 py-1 bg-white/3 text-[9px] font-bold uppercase tracking-widest text-slate-500 border-b border-white/5">
                {codeLang}
              </div>
            )}
            <pre className="p-3 bg-black/30 overflow-x-auto text-[11px] leading-relaxed font-mono text-slate-300">
              <code>{codeContent.trimEnd()}</code>
            </pre>
          </div>
        );
        codeBlock = false;
        codeContent = '';
        codeLang = '';
      } else {
        flushList(`list-pre-code-${i}`);
        codeBlock = true;
        codeLang = line.trim().replace('```', '');
      }
      continue;
    }

    if (codeBlock) { codeContent += line + '\n'; continue; }

    if (line.startsWith('### ')) {
      flushList(`list-h3-${i}`);
      elements.push(<h5 key={`h3-${i}`} className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mt-4 mb-1">{line.slice(4)}</h5>);
      continue;
    }
    if (line.startsWith('## ')) {
      flushList(`list-h2-${i}`);
      elements.push(<h4 key={`h2-${i}`} className="text-sm font-bold text-white mt-4 mb-1">{line.slice(3)}</h4>);
      continue;
    }
    if (line.startsWith('# ')) {
      flushList(`list-h1-${i}`);
      elements.push(<h3 key={`h1-${i}`} className="text-base font-bold text-white mt-3 mb-1">{line.slice(2)}</h3>);
      continue;
    }

    if (/^\s*[-*•]\s/.test(line)) { listItems.push(line.replace(/^\s*[-*•]\s+/, '')); continue; }
    if (/^\s*\d+\.\s/.test(line)) { listItems.push(line.replace(/^\s*\d+\.\s+/, '')); continue; }

    flushList(`list-${i}`);

    if (/^---+$/.test(line.trim())) { elements.push(<hr key={`hr-${i}`} className="my-3 border-white/5" />); continue; }
    if (line.trim() === '') continue;

    elements.push(
      <p key={`p-${i}`} className="text-xs leading-relaxed text-slate-300 mb-1.5" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
    );
  }

  flushList('list-end');
  return <div className="space-y-0">{elements}</div>;
}

/* ═══ Copy Button ═══ */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/* ═══ Center Panel ═══ */
export default function CenterPanel({ onAnalyze, onFollowUp, onGenerateReport }: CenterPanelProps) {
  const {
    messages, togglePinMessage, isAnalyzing,
    streamSteps, currentStep,
    followUpInput, setFollowUpInput,
  } = useSREStore();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamSteps]);

  const handleFollowUpSubmit = () => {
    if (followUpInput.trim()) {
      onFollowUp(followUpInput.trim());
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">AI Analysis Output</span>
        <span className="text-[9px] text-slate-600 font-mono">
          {messages.filter(m => m.role === 'assistant').length} responses
        </span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          /* Empty State */
          <div className="flex h-full flex-col items-center justify-center text-center px-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 mb-4">
              <Sparkles className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Ready to Debug</h2>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed mb-6">
              Paste logs, metrics, or traces in the left panel. The AI will stream a structured root cause analysis with evidence, impact assessment, and fix suggestions.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {[
                { icon: '🔍', title: 'Log Analysis', desc: 'Parse error patterns' },
                { icon: '🔗', title: 'Dependency Tracing', desc: 'Map cascade failures' },
                { icon: '⚡', title: 'Root Cause', desc: 'Pinpoint the origin' },
                { icon: '🛠', title: 'Fix Suggestions', desc: 'Step-by-step remediation' },
              ].map((f) => (
                <div key={f.title} className="surface px-3 py-2.5 text-left">
                  <span className="text-sm">{f.icon}</span>
                  <div className="text-[11px] font-bold text-white mt-1">{f.title}</div>
                  <div className="text-[10px] text-slate-500">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="space-y-3 max-w-4xl mx-auto">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="animate-fade-in"
                >
                  {msg.role === 'user' ? (
                    /* User Message */
                    <div className="flex justify-end mb-1">
                      <div className="flex items-start gap-2 max-w-[85%]">
                        <div className="px-3 py-2 rounded-lg bg-blue-600/20 border border-blue-500/20">
                          <pre className="text-xs font-mono whitespace-pre-wrap text-blue-200 leading-relaxed">{msg.content}</pre>
                        </div>
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-blue-600/20 text-blue-400 mt-0.5">
                          <UserRound className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Assistant Message */
                    <div className="flex items-start gap-2 max-w-full">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-emerald-500/10 text-emerald-400 mt-0.5">
                        <Zap className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Streaming Pipeline */}
                        {msg.isStreaming && currentStep > 0 && (
                          <StreamingResponse steps={streamSteps} currentStep={currentStep} />
                        )}

                        {/* Content */}
                        {msg.content && (
                          <div
                            className="px-3 py-2.5 rounded-lg border"
                            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                          >
                            <div className={msg.isStreaming && !msg.analysis ? 'streaming-cursor' : ''}>
                              <RenderMarkdown content={msg.content} />
                            </div>
                          </div>
                        )}

                        {/* Analysis Card */}
                        {msg.analysis && (
                          <AnalysisCard result={msg.analysis} />
                        )}

                        {/* Actions */}
                        {!msg.isStreaming && msg.role === 'assistant' && (
                          <div className="flex items-center gap-1 mt-1">
                            <button
                              onClick={() => togglePinMessage(msg.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold text-slate-500 hover:text-blue-400 hover:bg-white/5 transition-colors"
                            >
                              {msg.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                              {msg.isPinned ? 'Unpin' : 'Pin'}
                            </button>
                            <CopyBtn text={msg.content} />
                            {msg.analysis && (
                              <button
                                onClick={() => onGenerateReport(msg.analysis!)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold text-slate-500 hover:text-amber-400 hover:bg-white/5 transition-colors"
                              >
                                <FileDown className="h-3 w-3" />
                                Export RCA
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* Follow-up Input */}
      {messages.length > 0 && (
        <div className="px-4 py-2 border-t flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <input
              type="text"
              value={followUpInput}
              onChange={(e) => setFollowUpInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFollowUpSubmit()}
              placeholder="Ask a follow-up question..."
              className="flex-1 px-3 py-2 rounded-md text-xs bg-transparent border text-slate-300 placeholder:text-slate-600 focus:border-blue-500/50 transition-colors"
              style={{ borderColor: 'var(--border-subtle)' }}
              disabled={isAnalyzing}
            />
            <button
              onClick={handleFollowUpSubmit}
              disabled={isAnalyzing || !followUpInput.trim()}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                isAnalyzing || !followUpInput.trim()
                  ? 'text-slate-600 bg-white/3'
                  : 'text-white bg-blue-600 hover:bg-blue-500'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

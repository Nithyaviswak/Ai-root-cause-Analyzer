'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnalysisResult, ChatMessage, HistoryItem } from '@/types';
import { analyzeLogStream, getHistory, uploadFile, API_BASE } from '@/lib/api';
import { 
  FileText, Network, Zap, Wrench, UserRound, 
  LayoutDashboard, Share2, FileDown, Rocket, 
  CheckCircle2, MessageSquare, Activity, ArrowUp, Plus,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnalysisCard from './AnalysisCard';
import FloatingNav from './FloatingNav';
import HistorySidebar from './HistorySidebar';
import LogUpload from './LogUpload';
import StreamingResponse from './StreamingResponse';
import ThemeToggle from './ThemeToggle';
import ServiceGraph from './ServiceGraph';
import Dashboard from './Dashboard';

const SAMPLE_LOG = `ERROR 2024-01-15T10:20:06Z payment-service Connection timeout to payment gateway stripe-prod-01 after 5000ms
ERROR 2024-01-15T10:20:16Z payment-service Payment gateway unreachable after 3 attempts. Circuit breaker OPEN
ERROR 2024-01-15T10:20:16Z order-service Payment failed for order #ORD-2024-8891: PaymentGatewayUnavailableException
CRITICAL 2024-01-15T10:20:55Z monitoring Payment processing completely halted. All payment gateways unreachable.
ERROR 2024-01-15T10:21:00Z order-service Database connection timeout: pool exhausted, 47 pending requests
ERROR 2024-01-15T10:21:05Z api-gateway Upstream service order-service returned 504 Gateway Timeout
CRITICAL 2024-01-15T10:21:10Z monitoring Cascading failure detected across payment-service, order-service, api-gateway
ERROR 2024-01-15T10:22:05Z network-monitor External egress via NAT gateway nat-gw-prod-01 showing 78% packet loss`;

const WELCOME_FEATURES = [
  { label: 'Log Analysis', desc: 'Parse & understand error patterns', icon: FileText, color: '#3b82f6', bg: 'bg-blue-500/10' },
  { label: 'Dependency Tracing', desc: 'Map service cascade failures', icon: Network, color: '#6366f1', bg: 'bg-indigo-500/10' },
  { label: 'Root Cause Detection', desc: 'Pinpoint the exact origin', icon: Zap, color: '#10b981', bg: 'bg-emerald-500/10' },
  { label: 'Fix Suggestions', desc: 'Step-by-step remediation', icon: Wrench, color: '#8b5cf6', bg: 'bg-violet-500/10' },
];

const QUICK_ACTIONS = [
  { label: 'Explain in simpler terms', icon: '💡' },
  { label: 'How to fix this code?', icon: '🛠️' },
  { label: 'Show me similar incidents', icon: '📚' },
];

/* ═══ Simple Markdown Renderer ═══ */
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
        <ul key={key} className="space-y-1.5 my-3">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <span className="flex-shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500/60" />
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
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[13px] font-mono font-semibold text-rose-500 dark:text-rose-400">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (codeBlock) {
        elements.push(
          <div key={`code-${i}`} className="my-3 rounded-xl overflow-hidden border border-white/10">
            {codeLang && (
              <div className="px-4 py-1.5 bg-slate-800 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-white/5">
                {codeLang}
              </div>
            )}
            <pre className="p-4 bg-slate-950 overflow-x-auto text-[13px] leading-relaxed font-mono text-slate-200">
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

    if (codeBlock) {
      codeContent += line + '\n';
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      flushList(`list-pre-h3-${i}`);
      elements.push(
        <h5 key={`h3-${i}`} className="text-xs font-black uppercase tracking-[0.2em] text-blue-600 dark:text-sky-400 mt-5 mb-2">
          {line.slice(4)}
        </h5>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushList(`list-pre-h2-${i}`);
      elements.push(
        <h4 key={`h2-${i}`} className="text-sm font-extrabold text-slate-900 dark:text-white mt-5 mb-2">
          {line.slice(3)}
        </h4>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      flushList(`list-pre-h1-${i}`);
      elements.push(
        <h3 key={`h1-${i}`} className="text-base font-extrabold text-slate-900 dark:text-white mt-4 mb-2">
          {line.slice(2)}
        </h3>
      );
      continue;
    }

    // List items
    if (/^\s*[-*•]\s/.test(line)) {
      const text = line.replace(/^\s*[-*•]\s+/, '');
      listItems.push(text);
      continue;
    }
    if (/^\s*\d+\.\s/.test(line)) {
      const text = line.replace(/^\s*\d+\.\s+/, '');
      listItems.push(text);
      continue;
    }

    flushList(`list-${i}`);

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={`hr-${i}`} className="my-4 border-slate-200 dark:border-slate-700" />);
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-2"
        dangerouslySetInnerHTML={{ __html: formatInline(line) }}
      />
    );
  }

  flushList('list-end');

  return <div className="space-y-0">{elements}</div>;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [streamSteps, setStreamSteps] = useState<
    { step: number; title: string; status: 'pending' | 'running' | 'complete' }[]
  >([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);
  const [viewMode, setViewMode] = useState<'enhanced' | 'raw'>('enhanced');
  const [activeTab, setActiveTab] = useState<'chat' | 'topology' | 'dashboard'>('chat');
  const [lastAnalysis, setLastAnalysis] = useState<AnalysisResult | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom, streamSteps]);

  const loadHistory = useCallback(async () => {
    try {
      const items = await getHistory();
      setHistory(items);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();

    if (!text || isAnalyzing) {
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsAnalyzing(true);
    setStreamSteps([]);
    setCurrentStep(0);

    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, assistantMsg]);

    let finalResult: AnalysisResult | null = null;
    let llmContent = '';

    try {
      for await (const event of analyzeLogStream(text)) {
        if (event.type === 'progress') {
          setCurrentStep(event.step);
          setStreamSteps((prev) => [
            ...prev.filter((step) => step.step !== event.step),
            { step: event.step, title: event.title, status: 'running' },
          ]);
        } else if (event.type === 'step_complete') {
          setStreamSteps((prev) =>
            prev.map((step) =>
              step.step === event.step
                ? { ...step, title: event.title, status: 'complete' as const }
                : step,
            ),
          );
        } else if (event.type === 'llm_chunk' && event.content) {
          llmContent += event.content;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId ? { ...message, content: llmContent } : message,
            ),
          );
        } else if (event.type === 'analysis_complete' && event.result) {
          finalResult = event.result;
        }
      }
    } catch (err) {
      llmContent = `Analysis failed: ${
        err instanceof Error ? err.message : 'Connection error'
      }. Make sure the backend is running on http://localhost:8000`;
    }

    setMessages((prev) =>
      prev.map((message) =>
        message.id === assistantId
          ? {
              ...message,
              content: llmContent || 'Analysis complete.',
              analysis: finalResult || undefined,
              isStreaming: false,
            }
          : message,
      ),
    );

    if (finalResult) {
      setLastAnalysis(finalResult);
    }

    setIsAnalyzing(false);
    setStreamSteps([]);
    setCurrentStep(0);
    void loadHistory();
  }, [input, isAnalyzing, loadHistory]);

  const handleGenerateReport = async (analysis: AnalysisResult) => {
    setIsGeneratingReport(true);
    try {
      const response = await fetch(`${API_BASE}/api/analyze/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysis),
      });

      if (!response.ok) throw new Error('Failed to generate report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `postmortem_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);

    try {
      const result = await uploadFile(file);
      const sysMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `File uploaded: ${result.filename}\n\n${result.message}\n\n${result.document_count} chunks indexed and ready for retrieval.`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, sysMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errMsg]);
    }

    setIsUploading(false);
    setShowUpload(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const loadSampleLogs = () => {
    setInput(SAMPLE_LOG);
    textareaRef.current?.focus();
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-30">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-400/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-indigo-400/20 blur-[120px] rounded-full" />
      </div>

      {/* ═══ HEADER ═══ */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 flex items-center justify-between px-5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border-b border-white/20 dark:border-white/5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/20">
            <Zap className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              AI SRE <span className="text-blue-600 dark:text-sky-400">COPILOT</span>
            </h1>
            <span className="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase">Root Cause Analyzer</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="hidden sm:flex items-center bg-slate-100/80 dark:bg-white/5 rounded-xl p-1 border border-black/5 dark:border-white/5">
            {[
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'topology', label: 'Topology', icon: Share2 },
              { id: 'dashboard', label: 'Dashboard', icon: Activity },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'chat' | 'topology' | 'dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <tab.icon className="h-3 w-3" />
                {tab.label}
              </button>
            ))}
          </div>
          <ThemeToggle />
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`p-2 rounded-xl border transition-all ${showSidebar 
              ? 'border-blue-500/30 bg-blue-500/10 text-blue-500 dark:text-sky-400' 
              : 'border-white/20 bg-white/20 dark:bg-white/5 text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutDashboard className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className={`flex flex-1 min-h-0 pt-16 transition-all duration-500 ${showSidebar ? 'lg:pr-[320px]' : ''}`}>
        <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-6 pb-44 scroll-smooth">
            {activeTab === 'topology' ? (
              <div className="h-full min-h-[500px] w-full max-w-6xl mx-auto">
                <ServiceGraph data={lastAnalysis?.topology || null} />
              </div>
            ) : activeTab === 'dashboard' ? (
              <div className="w-full max-w-6xl mx-auto">
                <Dashboard />
              </div>
            ) : messages.length === 0 ? (
              /* ═══ WELCOME SCREEN ═══ */
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-sky-400 backdrop-blur-md"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    Intelligent Incident Analysis
                  </div>
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mt-8 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl leading-[1.1]"
                >
                  Debug Production Issues<br />
                  like an{' '}
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-sky-400 dark:to-indigo-400">
                    Expert SRE
                  </span>
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-5 max-w-xl text-base font-medium leading-relaxed text-slate-500 dark:text-slate-400"
                >
                  Paste logs, error traces, or metrics below. The AI will stream a complete root cause analysis with step-by-step troubleshooting instructions.
                </motion.p>

                {/* Feature Cards */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
                >
                  {WELCOME_FEATURES.map((feature, index) => (
                    <motion.div
                      key={feature.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 + index * 0.08 }}
                      className="group relative flex flex-col items-center gap-3 rounded-2xl border border-white/50 dark:border-white/5 bg-white/60 dark:bg-white/[0.03] p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:bg-white/80 dark:hover:bg-white/[0.06]"
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${feature.bg} transition-transform group-hover:scale-110`}
                      >
                        <feature.icon className="h-5 w-5" style={{ color: feature.color }} />
                      </div>
                      <div className="text-center">
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                          {feature.label}
                        </span>
                        <span className="block mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                          {feature.desc}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  type="button"
                  onClick={loadSampleLogs}
                  className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold tracking-wide transition-all hover:scale-105 shadow-lg"
                >
                  <Rocket className="h-3.5 w-3.5" />
                  Try Sample Logs
                </motion.button>
              </div>
            ) : (
              /* ═══ CHAT MESSAGES ═══ */
              <div className="space-y-5 max-w-4xl mx-auto pb-12">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[90%] lg:max-w-[80%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar */}
                        <div className={`h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-xl shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-slate-900 dark:bg-white'
                            : 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-white/30 dark:border-white/10 backdrop-blur-md'
                        }`}>
                          {msg.role === 'user' ? (
                            <UserRound className="h-4 w-4 text-white dark:text-slate-900" />
                          ) : (
                            <Zap className="h-3.5 w-3.5 text-blue-600 dark:text-sky-400" />
                          )}
                        </div>

                        {/* Message Content */}
                        <div className="flex flex-col gap-2 min-w-0">
                          <div className={`px-5 py-3.5 shadow-sm ${
                            msg.role === 'user'
                              ? 'rounded-2xl rounded-tr-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                              : 'rounded-2xl rounded-tl-md bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl border border-white/40 dark:border-white/5'
                          }`}>
                            {msg.role === 'user' ? (
                              <pre className="text-sm font-mono whitespace-pre-wrap leading-relaxed">{msg.content}</pre>
                            ) : (
                              <div className="space-y-2">
                                {msg.isStreaming && currentStep > 0 && (
                                  <StreamingResponse steps={streamSteps} currentStep={currentStep} />
                                )}
                                {msg.content && (
                                  viewMode === 'raw' ? (
                                    <pre className="text-xs font-mono whitespace-pre-wrap text-slate-700 dark:text-slate-300">{msg.content}</pre>
                                  ) : (
                                    <RenderMarkdown content={msg.content} />
                                  )
                                )}
                              </div>
                            )}
                          </div>

                          {/* Analysis Card */}
                          {msg.analysis && viewMode === 'enhanced' && (
                            <div className="mt-2 space-y-3">
                              <AnalysisCard result={msg.analysis} />
                              
                              {/* Action Buttons */}
                              <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-white/30 dark:border-white/5 backdrop-blur-md">
                                <span className="w-full text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 px-1">
                                  Quick Actions
                                </span>
                                <button
                                  onClick={() => handleGenerateReport(msg.analysis!)}
                                  disabled={isGeneratingReport}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold transition-all hover:scale-105 shadow-sm"
                                >
                                  <FileDown className="h-3 w-3" />
                                  {isGeneratingReport ? 'Generating...' : 'PDF Report'}
                                </button>
                                <button
                                  onClick={() => handleQuickAction('Explain this analysis in simple terms')}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-black/5 dark:border-white/5 text-[10px] font-bold transition-all hover:scale-105"
                                >
                                  <Zap className="h-3 w-3" /> Simplify
                                </button>
                                <button
                                  onClick={() => setActiveTab('topology')}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold transition-all hover:bg-indigo-500/20"
                                >
                                  <Share2 className="h-3 w-3" /> Topology
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Quick follow-ups for non-analysis messages */}
                          {!msg.isStreaming && msg.role === 'assistant' && !msg.analysis && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {QUICK_ACTIONS.map(action => (
                                <button
                                  key={action.label}
                                  onClick={() => handleQuickAction(action.label)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/50 dark:bg-white/5 text-[10px] font-bold text-slate-500 border border-white/40 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 transition-all"
                                >
                                  <span>{action.icon}</span>
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ═══ INPUT AREA ═══ */}
          <footer className="fixed bottom-0 inset-x-0 z-40 p-4 sm:p-6 pt-0 transition-all duration-500 pointer-events-none">
            <div className={`mx-auto max-w-3xl w-full pointer-events-auto transition-all ${showSidebar ? 'lg:pr-8' : ''}`}>
              {/* Upload Zone */}
              <AnimatePresence>
                {showUpload && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-3 overflow-hidden"
                  >
                    <div className="rounded-2xl border border-white/40 bg-white/70 dark:bg-slate-900/80 p-4 shadow-xl backdrop-blur-2xl dark:border-white/10">
                      <LogUpload onUpload={handleFileUpload} isUploading={isUploading} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Bar */}
              <div className="relative group">
                <div className="p-1.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/60 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex items-end gap-2">
                  <button
                    onClick={() => setShowUpload(!showUpload)}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                  </button>

                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Paste logs, describe the issue, or ask a question..."
                    className="flex-1 bg-transparent py-2 px-1 text-sm font-medium text-slate-900 dark:text-white outline-none placeholder:text-slate-400 min-h-[40px] max-h-[120px]"
                    rows={1}
                    disabled={isAnalyzing}
                    style={{ resize: 'none' }}
                  />

                  <button
                    onClick={() => void handleSubmit()}
                    disabled={isAnalyzing || !input.trim()}
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
                      isAnalyzing || !input.trim()
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600'
                        : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500 hover:scale-105'
                    }`}
                  >
                    {isAnalyzing ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="mt-2 text-center">
                  <span className="text-[9px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                    Shift+Enter for newline • Powered by Gemini + RAG
                  </span>
                </div>
              </div>
            </div>
          </footer>
        </main>

        {/* ═══ SIDEBAR ═══ */}
        {showSidebar && (
          <aside className="fixed right-0 top-0 bottom-0 z-30 w-[320px] bg-white/50 dark:bg-slate-950/50 backdrop-blur-2xl border-l border-white/20 dark:border-white/5 pt-20 shadow-2xl hidden lg:block">
            <HistorySidebar items={history} onSelect={(id) => console.log('Selected:', id)} />
          </aside>
        )}
      </div>
    </div>
  );
}

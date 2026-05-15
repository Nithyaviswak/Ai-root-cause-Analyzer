/* ═══ Zustand Global Store — AI SRE Copilot ═══ */

import { create } from 'zustand';
import type {
  ChatMessage,
  AnalysisResult,
  HistoryItem,
  Environment,
  IncidentStatus,
  NavTab,
  InputTab,
  VoiceState,
  ServiceStatus,
} from '@/types';

/* ── State Shape ── */

interface SREStore {
  // Navigation
  activeNav: NavTab;
  setActiveNav: (tab: NavTab) => void;

  // Environment
  environment: Environment;
  setEnvironment: (env: Environment) => void;

  // Incident
  incidentStatus: IncidentStatus;
  setIncidentStatus: (status: IncidentStatus) => void;

  // Input Panel
  activeInputTab: InputTab;
  setActiveInputTab: (tab: InputTab) => void;
  logInput: string;
  setLogInput: (val: string) => void;
  metricsInput: string;
  setMetricsInput: (val: string) => void;
  tracesInput: string;
  setTracesInput: (val: string) => void;

  // Chat / Analysis
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  togglePinMessage: (id: string) => void;

  // Streaming
  isAnalyzing: boolean;
  setIsAnalyzing: (val: boolean) => void;
  streamSteps: { step: number; title: string; status: 'pending' | 'running' | 'complete' }[];
  setStreamSteps: (steps: { step: number; title: string; status: 'pending' | 'running' | 'complete' }[]) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;

  // Results
  lastAnalysis: AnalysisResult | null;
  setLastAnalysis: (result: AnalysisResult | null) => void;

  // History
  history: HistoryItem[];
  setHistory: (items: HistoryItem[]) => void;

  // UI
  leftPanelOpen: boolean;
  setLeftPanelOpen: (val: boolean) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (val: boolean) => void;
  followUpInput: string;
  setFollowUpInput: (val: string) => void;

  // Voice
  voice: VoiceState;
  setVoice: (val: Partial<VoiceState>) => void;

  // Services
  services: ServiceStatus[];
  setServices: (services: ServiceStatus[]) => void;

  // Cache
  analysisCache: Map<string, AnalysisResult>;
  cacheAnalysis: (key: string, result: AnalysisResult) => void;
  getCachedAnalysis: (key: string) => AnalysisResult | undefined;
}

/* ── Store Implementation ── */

export const useSREStore = create<SREStore>((set, get) => ({
  // Navigation
  activeNav: 'chat',
  setActiveNav: (tab) => set({ activeNav: tab }),

  // Environment
  environment: 'production',
  setEnvironment: (env) => set({ environment: env }),

  // Incident
  incidentStatus: 'investigating',
  setIncidentStatus: (status) => set({ incidentStatus: status }),

  // Input Panel
  activeInputTab: 'logs',
  setActiveInputTab: (tab) => set({ activeInputTab: tab }),
  logInput: '',
  setLogInput: (val) => set({ logInput: val }),
  metricsInput: '',
  setMetricsInput: (val) => set({ metricsInput: val }),
  tracesInput: '',
  setTracesInput: (val) => set({ tracesInput: val }),

  // Chat
  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateMessage: (id, updates) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  clearMessages: () => set({ messages: [] }),
  togglePinMessage: (id) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, isPinned: !m.isPinned } : m,
      ),
    })),

  // Streaming
  isAnalyzing: false,
  setIsAnalyzing: (val) => set({ isAnalyzing: val }),
  streamSteps: [],
  setStreamSteps: (steps) => set({ streamSteps: steps }),
  currentStep: 0,
  setCurrentStep: (step) => set({ currentStep: step }),

  // Results
  lastAnalysis: null,
  setLastAnalysis: (result) => set({ lastAnalysis: result }),

  // History
  history: [],
  setHistory: (items) => set({ history: items }),

  // UI
  leftPanelOpen: true,
  setLeftPanelOpen: (val) => set({ leftPanelOpen: val }),
  rightPanelOpen: true,
  setRightPanelOpen: (val) => set({ rightPanelOpen: val }),
  followUpInput: '',
  setFollowUpInput: (val) => set({ followUpInput: val }),

  // Voice
  voice: {
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    transcript: '',
    partialTranscript: '',
    error: null,
  },
  setVoice: (updates) =>
    set((s) => ({ voice: { ...s.voice, ...updates } })),

  // Services
  services: [
    { name: 'api-gateway', health: 'healthy', latency: 45, errorRate: 0.1, lastCheck: new Date() },
    { name: 'auth-service', health: 'healthy', latency: 32, errorRate: 0.0, lastCheck: new Date() },
    { name: 'payment-service', health: 'degraded', latency: 890, errorRate: 12.4, lastCheck: new Date() },
    { name: 'order-service', health: 'down', latency: 5000, errorRate: 78.2, lastCheck: new Date() },
    { name: 'notification-svc', health: 'healthy', latency: 28, errorRate: 0.3, lastCheck: new Date() },
    { name: 'database-primary', health: 'degraded', latency: 350, errorRate: 5.1, lastCheck: new Date() },
  ],
  setServices: (services) => set({ services }),

  // Cache
  analysisCache: new Map(),
  cacheAnalysis: (key, result) => {
    const cache = get().analysisCache;
    cache.set(key, result);
    set({ analysisCache: new Map(cache) });
  },
  getCachedAnalysis: (key) => get().analysisCache.get(key),
}));

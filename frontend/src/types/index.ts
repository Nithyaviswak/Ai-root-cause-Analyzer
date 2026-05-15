/* ═══ AI SRE Copilot — Type Definitions ═══ */

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Environment = 'production' | 'staging' | 'development';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';
export type ServiceHealth = 'healthy' | 'degraded' | 'down';
export type InputTab = 'logs' | 'metrics' | 'traces' | 'voice';
export type NavTab = 'chat' | 'incidents' | 'topology' | 'metrics' | 'alerts';

export interface AnalysisResult {
  detected_issue: string;
  severity: Severity;
  affected_services: string[];
  root_cause: string;
  evidence: string[];
  confidence_score: string;
  suggested_fix: string;
  improved_code?: string;
  preventive_measures: string;
  topology?: {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
  };
  sre_workflow?: Record<string, unknown>;
}

export interface TopologyNode {
  id: string;
  label: string;
  status: ServiceHealth;
  error_rate: string;
  type?: string;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  analysis?: AnalysisResult;
  isStreaming?: boolean;
  isPinned?: boolean;
}

export interface StreamProgress {
  step: number;
  title: string;
  type: 'progress' | 'step_complete' | 'llm_chunk' | 'analysis_complete' | 'error';
  data?: Record<string, unknown>;
  content?: string;
  result?: AnalysisResult;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  input_summary: string;
  severity: string;
  detected_issue: string;
  confidence_score: string;
}

export interface UploadResponse {
  filename: string;
  document_count: number;
  message: string;
}

export interface ServiceStatus {
  name: string;
  health: ServiceHealth;
  latency: number;
  errorRate: number;
  lastCheck: Date;
}

export interface IncidentEvent {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  timestamp: string;
  affectedServices: string[];
  summary: string;
}

export interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  transcript: string;
  partialTranscript: string;
  error: string | null;
}
